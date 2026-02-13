"""
Realtime Voice AI Sales Agent - WebSocket Endpoint
Pipeline: Browser Mic -> GPT-4o Realtime API (STT + LLM, text mode) -> ElevenLabs TTS -> Browser Audio

Notes:
- This version strips timestamp-like tokens such as "00:05" or "[00:05]"
  from both transcripts and agent responses before sending to TTS or the browser.
- Keeps numeric digits intact so numbers are spoken reliably.
- Adds voice_settings nudges likely to produce an Indian accent (depends on ElevenLabs model/voice).
- Streams raw PCM16 audio (24kHz, mono) per-sentence to browser for low-latency playback.
"""

import io
import json
import asyncio
import base64
import logging
import re
from uuid import uuid4
from typing import Optional

import aiohttp
from fastapi import WebSocket, WebSocketDisconnect

from ..core.config import settings
from .knowledge_base import (
    build_realtime_system_instructions,
    get_knowledge_base_config,
)

logger = logging.getLogger(__name__)


def safe_print(msg: str):
    """Print that won't crash on Windows cp1252 with Hindi/Unicode text."""
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", errors="replace").decode("ascii"))


# ---------------------------
# Text sanitation utilities
# ---------------------------

# Remove leading or inline timecodes like:
# 00:05, 0:05, 00:05:12, [00:05], (00:05), 00-05 (rare)
_TIMEcode_RE = re.compile(
    r"""
    (?:
      ^\s*                                  # at start of string (or after whitespace)
      |(?<=\s)                              # or preceded by whitespace
    )
    (?:\[|\(|\{)?                           # optional opening bracket
    (?:\d{1,2}:\d{2}(?::\d{2})?)            # hh:mm or hh:mm:ss or m:ss
    (?:\]|\)|\})?                           # optional closing bracket
    (?=\s|$|[.,;:!?)])                      # followed by space or end or punctuation
    """,
    re.VERBOSE,
)


def _remove_timecodes(text: str) -> str:
    """Remove timecode-like tokens that commonly appear at start of transcripts or responses."""
    if not text:
        return text
    # Remove all visible timecode patterns
    cleaned = _TIMEcode_RE.sub("", text)
    # Also remove repeated leading patterns like "00:05 00:05 " etc.
    cleaned = re.sub(r'^(?:\s*:?0?\d{1,2}:\d{2}\s*)+', '', cleaned)
    return cleaned.strip()


def _split_into_tts_chunks(text: str) -> list[str]:
    """Split text into short sentence chunks for TTS streaming.

    Rules:
    - Split on sentence boundaries (. ? ! newlines)
    - Each chunk should be 1-2 sentences, max ~80 chars
    - Never send more than ~15 words in one TTS call to reduce prosody resets
    """
    if not text or not text.strip():
        return []

    # Basic sentence split (keep punctuation)
    raw_parts = re.split(r'(?<=[.?!])\s+|\n+', text.strip())

    chunks = []
    current = ""

    for part in raw_parts:
        part = part.strip()
        if not part:
            continue

        if current and len(current) + len(part) + 1 <= 80 and len((current + " " + part).split()) <= 20:
            current += " " + part
        else:
            if current:
                chunks.append(current)
            current = part

    if current:
        chunks.append(current)

    # Safety: if any chunk is too long in words, split by commas or naive word-splits
    normalized = []
    for c in chunks:
        words = c.split()
        if len(words) > 20:
            subparts = [p.strip() for p in re.split(r',\s*', c) if p.strip()]
            if len(subparts) == 1:
                i = 0
                while i < len(words):
                    normalized.append(" ".join(words[i:i + 15]))
                    i += 15
            else:
                for sp in subparts:
                    if sp:
                        normalized.append(sp)
        else:
            normalized.append(c)

    return normalized if normalized else [text.strip()]


def _normalize_text(text: Optional[str]) -> str:
    """Normalize text for TTS:
    - Remove Devanagari characters (avoid prosody resets)
    - Replace Devanagari danda with period
    - Normalize ellipsis to single period
    - Remove timecodes like 00:05
    - Collapse multiple spaces
    - Preserve digits
    """
    if not text:
        return ""

    # Remove leading & inline timecodes early
    text = _remove_timecodes(text)

    # Replace Devanagari danda with period
    text = text.replace("\u0964", ".")

    # Remove Devanagari characters (U+0900–U+097F)
    text = re.sub(r"[\u0900-\u097F]+", "", text)

    # Normalize ellipsis and similar
    text = text.replace("…", ".").replace("...", ".")

    # Collapse multiple spaces
    text = re.sub(r"\s{2,}", " ", text)

    # Trim
    text = text.strip()

    return text


# ---------------------------
# Voice agent session class
# ---------------------------

class VoiceAgentSession:
    """Manages a single realtime voice call session using GPT-4o Realtime API."""

    def __init__(self, websocket: WebSocket, language_preference: str = "hinglish"):
        self.websocket = websocket
        self.language_preference = language_preference
        self.session_id = str(uuid4())

        # OpenAI Realtime API WebSocket
        self.openai_ws = None          # aiohttp ClientWebSocketResponse
        self._aiohttp_session = None   # aiohttp ClientSession

        # State
        self.is_active = True
        self.is_speaking = False       # True while TTS is streaming to browser
        self._interrupted = False      # True when user barges in during TTS
        self._openai_listener_task = None
        self._tts_queue: asyncio.Queue = asyncio.Queue()  # TTS text queue
        self._tts_worker_task = None   # Background TTS worker
        self._full_response_text = ""  # Full response accumulator
        self._welcome_done = False     # Prevent duplicate welcome
        self._ready_for_audio = False  # Gate: don't forward mic audio until welcome is done
        self._got_first_user_speech = False  # Suppress auto-response before real user speech
        self._response_count = 0       # Count OpenAI-generated responses (first one is always noise-triggered)

    # ------------------------------------------------------------------
    # Session Lifecycle
    # ------------------------------------------------------------------

    async def start(self):
        """Send welcome message with ElevenLabs TTS, then start TTS worker."""
        if self._welcome_done:
            return
        self._welcome_done = True

        kb = get_knowledge_base_config()
        welcome_text = kb.get(
            "welcome_message",
            "Hello! Mera naam Chitti hai, RSC Group Dholera se.",
        )

        # Clean welcome text of timecodes and normalize before sending to UI/TTS
        welcome_text_clean = _normalize_text(welcome_text)

        # Send welcome text to browser transcript
        await self.send_json({
            "event": "agent_text",
            "text": welcome_text_clean,
            "language": "hinglish",
            "is_on_topic": True,
        })

        # Speaking state
        await self.send_json({"event": "agent_state", "state": "speaking"})

        # Generate and stream TTS for welcome (single line only)
        welcome_speak = welcome_text_clean.split("\n")[0] if "\n" in welcome_text_clean else welcome_text_clean
        await self.generate_and_send_tts(welcome_speak)
        await self.send_json({"event": "agent_audio_end"})
        self.is_speaking = False

        # Inject welcome message into OpenAI conversation history so it
        # knows the greeting has already been spoken and does NOT generate
        # a duplicate greeting on first user turn.
        await self._send_to_openai({
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "assistant",
                "content": [
                    {
                        "type": "text",
                        "text": welcome_text_clean,
                    }
                ],
            },
        })

        # Clear any audio that accumulated during welcome TTS playback
        # so OpenAI VAD doesn't mistake ambient noise for user speech
        await self._send_to_openai({
            "type": "input_audio_buffer.clear",
        })
        safe_print("[VOICE] Injected welcome into OpenAI history + cleared audio buffer")

        # Brief delay before opening mic gate — lets the echo from
        # welcome TTS fade so OpenAI VAD doesn't false-trigger
        await asyncio.sleep(1.5)

        # Clear buffer again after the delay (catches any residual noise)
        await self._send_to_openai({
            "type": "input_audio_buffer.clear",
        })

        # Mark ready to receive mic audio (gate in main loop)
        self._ready_for_audio = True
        safe_print("[VOICE] Mic gate OPEN — ready for user speech")

        # Now listening for user
        await self.send_json({"event": "agent_state", "state": "listening"})

        # Start the TTS worker for subsequent responses
        self._tts_worker_task = asyncio.create_task(
            self._run_tts_worker_loop()
        )

    # ------------------------------------------------------------------
    # OpenAI Realtime API Connection
    # ------------------------------------------------------------------

    async def connect_openai_realtime(self) -> bool:
        """Open WebSocket to OpenAI Realtime API. Retries up to 3 times."""
        safe_print(
            f"[VOICE] Attempting OpenAI Realtime connection... "
            f"API key present: {bool(settings.OPENAI_API_KEY)}"
        )

        if not settings.OPENAI_API_KEY:
            safe_print("[VOICE] ERROR: No OpenAI API key!")
            await self.send_json({
                "event": "error",
                "message": "OpenAI API key not configured. Set OPENAI_API_KEY in .env",
            })
            return False

        model = settings.OPENAI_REALTIME_MODEL
        url = f"wss://api.openai.com/v1/realtime?model={model}"

        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "OpenAI-Beta": "realtime=v1",
        }

        max_retries = 3
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                safe_print(
                    f"[VOICE] Connecting to OpenAI Realtime "
                    f"(attempt {attempt}/{max_retries})..."
                )
                self._aiohttp_session = aiohttp.ClientSession()
                self.openai_ws = await asyncio.wait_for(
                    self._aiohttp_session.ws_connect(url, headers=headers),
                    timeout=15,
                )

                # Start listener for Realtime API server events
                self._openai_listener_task = asyncio.create_task(
                    self._listen_openai()
                )

                safe_print(
                    f"[VOICE] [OK] OpenAI Realtime connected on attempt {attempt}!"
                )
                logger.info(f"[{self.session_id}] OpenAI Realtime connected")

                # Configure session (modalities, VAD, system prompt)
                await self._configure_session()

                return True

            except Exception as e:
                last_error = e
                safe_print(
                    f"[VOICE] [FAIL] Attempt {attempt} failed: "
                    f"{type(e).__name__}: {e}"
                )
                if self._aiohttp_session:
                    await self._aiohttp_session.close()
                    self._aiohttp_session = None
                self.openai_ws = None

                if attempt < max_retries:
                    wait_time = attempt * 1
                    safe_print(f"[VOICE] Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)

        safe_print(
            f"[VOICE] [FAIL] All {max_retries} attempts failed. "
            f"Last error: {last_error}"
        )
        logger.error(
            f"[{self.session_id}] OpenAI Realtime connection failed "
            f"after {max_retries} retries: {last_error}"
        )
        await self.send_json({
            "event": "error",
            "message": "Voice AI connection failed. Please try again.",
        })
        return False

    async def _configure_session(self):
        """Send session.update to OpenAI Realtime API with KB prompt + VAD config."""
        kb = get_knowledge_base_config()
        rt_config = kb.get("realtime_voice_config", {})

        # Server-side VAD: balanced threshold for reliable speech detection
        turn_detection = rt_config.get("turn_detection", {
            "type": "server_vad",
            "threshold": 0.60,
            "silence_duration_ms": 1000,
            "prefix_padding_ms": 300,
        })

        instructions = build_realtime_system_instructions(
            self.language_preference
        )

        session_update = {
            "type": "session.update",
            "session": {
                "modalities": ["text"],
                "instructions": instructions,
                "input_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1",
                    "language": "en",
                },
                "turn_detection": turn_detection,
                "temperature": rt_config.get("temperature", 0.7),
                "max_response_output_tokens": rt_config.get(
                    "max_response_output_tokens", 300
                ),
            },
        }

        await self._send_to_openai(session_update)
        safe_print("[VOICE] [OK] session.update sent (text-only mode, server_vad)")

    # ------------------------------------------------------------------
    # OpenAI Realtime API Listener
    # ------------------------------------------------------------------

    async def _listen_openai(self):
        """Listen for events from OpenAI Realtime API."""
        try:
            async for msg in self.openai_ws:
                if not self.is_active:
                    break

                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        event = json.loads(msg.data)
                        await self._handle_openai_event(event)
                    except json.JSONDecodeError:
                        pass
                    except Exception as e:
                        logger.error(
                            f"[{self.session_id}] OpenAI event error: {e}"
                        )

                elif msg.type in (
                    aiohttp.WSMsgType.CLOSED,
                    aiohttp.WSMsgType.ERROR,
                ):
                    logger.info(
                        f"[{self.session_id}] OpenAI WebSocket closed/error"
                    )
                    break

        except Exception as e:
            logger.error(f"[{self.session_id}] OpenAI listener error: {e}")

    async def _handle_openai_event(self, event: dict):
        """Process a single event from the OpenAI Realtime API."""
        event_type = event.get("type", "")

        # ---- Session Events ----
        if event_type == "session.created":
            safe_print(f"[VOICE] OpenAI session created: {event.get('session', {}).get('id', '?')}")

        elif event_type == "session.updated":
            safe_print("[VOICE] OpenAI session config updated OK")

        # ---- VAD Speech Events ----
        elif event_type == "input_audio_buffer.speech_started":
            safe_print("[VOICE] User started speaking")
            # BARGE-IN: If agent is currently speaking, interrupt TTS
            if self.is_speaking:
                safe_print("[VOICE] >> BARGE-IN: User interrupted agent, stopping TTS")
                self._interrupted = True
                self.is_speaking = False
                # Drain the TTS queue so worker doesn't play stale text
                while not self._tts_queue.empty():
                    try:
                        self._tts_queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break
                # Tell browser to stop playing audio immediately
                await self.send_json({"event": "agent_audio_stop"})
                await self.send_json({"event": "agent_audio_end"})

            await self.send_json({
                "event": "agent_state",
                "state": "listening",
            })

        elif event_type == "input_audio_buffer.speech_stopped":
            safe_print("[VOICE] User stopped speaking -> thinking")
            await self.send_json({
                "event": "agent_state",
                "state": "thinking",
            })

        elif event_type == "input_audio_buffer.committed":
            safe_print("[VOICE] Audio buffer committed to conversation")

        # ---- User Transcript (Whisper) ----
        elif event_type == "conversation.item.input_audio_transcription.completed":
            transcript = event.get("transcript", "").strip()
            if transcript:
                self._got_first_user_speech = True
            if transcript:
                # Clean out timecodes before sending to UI/transcript
                transcript_clean = _remove_timecodes(transcript)
                safe_print(f"[VOICE] User said: {transcript_clean}")
                await self.send_json({
                    "event": "transcript",
                    "text": transcript_clean,
                    "is_final": True,
                    "speech_final": True,
                })

        elif event_type == "conversation.item.input_audio_transcription.failed":
            error = event.get("error", {})
            safe_print(f"[VOICE] Transcription failed: {error.get('message', '?')}")

        # ---- Response Text Streaming ----
        elif event_type == "response.text.delta":
            delta = event.get("delta", "")
            self._full_response_text += delta

        elif event_type == "response.text.done":
            # Get full response text
            full_text = (
                event.get("text", "") or self._full_response_text
            ).strip()
            self._full_response_text = ""

            if full_text:
                self._response_count += 1

                # Suppress any response that arrives before real user speech.
                # Welcome greeting is already handled via ElevenLabs TTS in start().
                # Noise-triggered auto-responses happen before Whisper confirms speech.
                if not self._got_first_user_speech:
                    safe_print(f"[VOICE] SUPPRESSED response #{self._response_count} (pre-speech): {full_text[:80]}")
                    # Still consume the sentinel so TTS worker stays in sync
                    await self._tts_queue.put(None)
                    return

                # Remove timecodes that may be prepended by model
                full_text = _remove_timecodes(full_text)

                safe_print(f"[VOICE] Agent response (preview): {full_text[:120]}")

                # Detect language presence roughly (keeps behavior similar)
                has_hindi = any(
                    0x0900 < ord(c) < 0x097F for c in full_text
                )
                has_english = any(
                    c.isascii() and c.isalpha() for c in full_text
                )
                if has_hindi and has_english:
                    lang = "hinglish"
                elif has_hindi:
                    lang = "hi"
                else:
                    lang = "en"

                is_on_topic = not any(
                    m in full_text.lower()
                    for m in ["outside my area", "bahar hai", "mere area se bahar", "i can only"]
                )

                # Send agent text to browser for transcript (cleaned)
                await self.send_json({
                    "event": "agent_text",
                    "text": full_text.strip(),
                    "language": lang,
                    "is_on_topic": is_on_topic,
                })

                # Queue TTS for the entire (cleaned) response
                await self._tts_queue.put(full_text)

            # Signal end-of-text to TTS worker (sentinel)
            await self._tts_queue.put(None)

        # ---- Response lifecycle ----
        elif event_type == "response.created":
            safe_print("[VOICE] OpenAI response generation started")

        elif event_type == "response.done":
            safe_print("[VOICE] OpenAI response done")

        # ---- Errors ----
        elif event_type == "error":
            error_data = event.get("error", {})
            error_msg = error_data.get("message", "Unknown error")
            safe_print(f"[VOICE] OpenAI Realtime error: {error_msg}")
            logger.error(
                f"[{self.session_id}] OpenAI Realtime error: {error_data}"
            )
            await self.send_json({
                "event": "error",
                "message": f"AI error: {error_msg}",
            })

    # ------------------------------------------------------------------
    # TTS Worker
    # ------------------------------------------------------------------

    async def _run_tts_worker_loop(self):
        """
        Continuously runs TTS for each GPT response.
        Splits text into short sentence chunks for smooth TTS streaming.
        None sentinel = end of response.
        Respects _interrupted flag for barge-in.
        """
        try:
            while self.is_active:
                text = await self._tts_queue.get()
                if text is None:
                    # End of a response — signal browser
                    if not self._interrupted:
                        await self.send_json({"event": "agent_audio_end"})
                    self.is_speaking = False
                    self._interrupted = False
                    await self.send_json({
                        "event": "agent_state",
                        "state": "listening",
                    })
                    continue  # Wait for next response

                # Reset interrupt flag for new response
                self._interrupted = False

                # Human-like pause before responding (500ms — warm, unhurried feel)
                await asyncio.sleep(0.5)

                # Check if interrupted during the pause
                if self._interrupted:
                    safe_print("[VOICE] TTS skipped (interrupted during pause)")
                    continue

                # Set speaking state
                await self.send_json({
                    "event": "agent_state",
                    "state": "speaking",
                })

                # Normalize text (strip Devanagari, fix punctuation, remove timecodes)
                text = _normalize_text(text)

                # Split into short sentence chunks for smooth TTS
                chunks = _split_into_tts_chunks(text)
                safe_print(f"[VOICE] TTS split into {len(chunks)} chunks")

                for i, chunk in enumerate(chunks):
                    if not self.is_active or self._interrupted:
                        safe_print(f"[VOICE] TTS chunk {i+1} skipped (interrupted)")
                        break
                    safe_print(f"[VOICE] TTS chunk {i+1}/{len(chunks)}: {chunk[:60]}...")
                    await self.generate_and_send_tts(chunk)

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"[{self.session_id}] TTS worker error: {e}")
            self.is_speaking = False

    # ------------------------------------------------------------------
    # Send Audio to OpenAI Realtime
    # ------------------------------------------------------------------

    async def send_audio_to_openai(self, audio_data: bytes):
        """Base64-encode PCM audio and ALWAYS send to OpenAI Realtime API.

        We always forward audio so OpenAI VAD can detect user speech
        even while agent is speaking (enables barge-in).
        """
        if self.openai_ws and not self.openai_ws.closed:
            try:
                audio_b64 = base64.b64encode(audio_data).decode("ascii")
                await self._send_to_openai({
                    "type": "input_audio_buffer.append",
                    "audio": audio_b64,
                })
            except Exception as e:
                logger.error(
                    f"[{self.session_id}] Send audio to OpenAI failed: {e}"
                )

    async def _send_to_openai(self, data: dict):
        """Send a JSON event to the OpenAI Realtime API WebSocket."""
        if self.openai_ws and not self.openai_ws.closed:
            try:
                await self.openai_ws.send_json(data)
            except Exception as e:
                logger.error(
                    f"[{self.session_id}] OpenAI WS send failed: {e}"
                )

    # ------------------------------------------------------------------
    # ElevenLabs TTS — streams raw PCM16 audio to browser
    # Called per-sentence by _tts_worker (no longer waits for full text)
    # ------------------------------------------------------------------

    async def generate_and_send_tts(self, text: str):
        """Generate TTS audio via ElevenLabs (PCM16 format) and stream to browser.

        Called per sentence chunk. Does NOT send agent_audio_end
        (the TTS worker sends that after all sentences are done).

        PCM FORMAT:
        - Output: pcm_24000 (24kHz, 16-bit signed LE, mono)
        - No codec overhead — raw samples streamed directly
        - Browser decodes via AudioContext at 24kHz
        - Streams 16KB chunks for smooth low-latency playback
        """
        if not settings.ELEVENLABS_API_KEY or not text.strip():
            return

        self.is_speaking = True
        kb = get_knowledge_base_config()
        voice_config = kb.get("voice_config", {})
        voice_id = voice_config.get("voice_id", "NXsB2Ew7UyH5JDkfI3LF")
        model_id = voice_config.get("model_id", "eleven_turbo_v2_5")

        try:
            # PCM output: 24kHz 16-bit signed little-endian mono
            output_format = voice_config.get("output_format", "pcm_24000")
            optimize_latency = voice_config.get(
                "optimize_streaming_latency", 4
            )

            async with aiohttp.ClientSession() as session:
                url = (
                    f"https://api.elevenlabs.io/v1/text-to-speech/"
                    f"{voice_id}/stream"
                    f"?optimize_streaming_latency={optimize_latency}"
                    f"&output_format={output_format}"
                )

                headers = {
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "audio/pcm, */*",
                }

                # Speed: 0.95 = natural pace, not slow
                speed = voice_config.get("speed", 0.95)

                payload = {
                    "text": text,
                    "model_id": model_id,
                    "voice_settings": {
                        "stability": voice_config.get("stability", 0.40),
                        "similarity_boost": voice_config.get("similarity_boost", 0.85),
                        "style": voice_config.get("style", 0.35),
                        "use_speaker_boost": voice_config.get("use_speaker_boost", True),
                        "speed": speed,
                    },
                }

                safe_print(f"[VOICE] ElevenLabs TTS request: model={model_id}, voice={voice_id}, format={output_format}, text_len={len(text)}")

                async with session.post(url, headers=headers, json=payload) as resp:
                    if resp.status != 200:
                        err_text = await resp.text()
                        safe_print(f"[VOICE] [FAIL] ElevenLabs TTS error: {resp.status} - {err_text[:300]}")
                        logger.error(
                            f"[{self.session_id}] ElevenLabs TTS error: {resp.status} - {err_text}"
                        )
                        return

                    # Read full PCM audio bytes in memory (one sentence only)
                    audio_bytes = await resp.read()
                    if not audio_bytes:
                        logger.error(f"[{self.session_id}] ElevenLabs returned empty audio for text={text!r}")
                        return

                    # Stream PCM in 16KB chunks (PCM has no frame boundaries, any split is safe)
                    CHUNK_SIZE = 16384  # 16 KB — small for low latency
                    buffer = io.BytesIO(audio_bytes)

                    await self.send_json({"event": "agent_audio_chunk_start", "text_preview": text[:80]})

                    while True:
                        chunk = buffer.read(CHUNK_SIZE)
                        if not chunk or not self.is_active:
                            break
                        try:
                            # Send raw PCM16 bytes to websocket
                            await self.websocket.send_bytes(chunk)
                        except Exception as e:
                            logger.error(f"[{self.session_id}] Error sending PCM chunk to websocket: {e}")
                            break

                        # Pacing: small delay between chunks
                        await asyncio.sleep(0.01)

                    await self.send_json({"event": "agent_audio_chunk_end", "text_preview": text[:80]})

                    # Natural pause after each sentence (350ms — warm, breathing room)
                    await asyncio.sleep(0.35)

        except Exception as e:
            logger.exception(f"[{self.session_id}] TTS generation error: {e}")
        finally:
            pass

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def send_json(self, data: dict):
        """Send JSON message to browser WebSocket."""
        try:
            if self.is_active:
                await self.websocket.send_json(data)
        except Exception as e:
            logger.error(f"[{self.session_id}] Send to browser failed: {e}")

    async def cleanup(self):
        """Clean up resources when call ends."""
        self.is_active = False

        # Close OpenAI Realtime WebSocket
        if self.openai_ws and not self.openai_ws.closed:
            try:
                await self.openai_ws.close()
            except Exception:
                pass

        # Close aiohttp session
        if self._aiohttp_session:
            try:
                await self._aiohttp_session.close()
            except Exception:
                pass
            self._aiohttp_session = None

        # Cancel listener task
        if self._openai_listener_task:
            self._openai_listener_task.cancel()
            try:
                await self._openai_listener_task
            except asyncio.CancelledError:
                pass

        # Cancel TTS worker
        if self._tts_worker_task:
            self._tts_worker_task.cancel()
            try:
                await self._tts_worker_task
            except asyncio.CancelledError:
                pass

        logger.info(f"[{self.session_id}] Voice agent session cleaned up")


# ========================================================================
# WebSocket Endpoint Handler
# ========================================================================


async def voice_agent_websocket_handler(
    websocket: WebSocket, token: str = None
):
    """
    WebSocket endpoint for Realtime Voice AI Sales Agent.

    Connection: ws://host:8000/ws/voice-agent?token=JWT

    Protocol:
    - Browser sends binary audio chunks (Linear16 PCM, 16kHz, mono)
    - Browser sends JSON control messages: {"event": "start"/"stop"}
    - Server sends JSON events: transcript, agent_text, agent_state, error
    - Server sends binary audio chunks (PCM16 24kHz mono) for TTS playback
    """
    await websocket.accept()

    session = None
    safe_print("[VOICE] =======================================")
    safe_print("[VOICE] WebSocket CONNECTED - Voice Agent (GPT-4o Realtime)")
    safe_print(f"[VOICE] Token present: {bool(token)}")
    logger.info("Voice agent WebSocket connected")

    try:
        # Wait for start event
        while True:
            raw = await websocket.receive()

            if "text" in raw:
                try:
                    msg = json.loads(raw["text"])
                    event = msg.get("event", "")

                    if event == "start":
                        language = msg.get("language", "hinglish")
                        safe_print(
                            f"[VOICE] Received 'start' event, language={language}"
                        )
                        session = VoiceAgentSession(websocket, language)

                        # Connect to OpenAI Realtime API
                        safe_print("[VOICE] Connecting to OpenAI Realtime API...")
                        connected = await session.connect_openai_realtime()
                        if not connected:
                            safe_print(
                                "[VOICE] [FAIL] OpenAI Realtime connection "
                                "failed - sending error to client"
                            )
                            await websocket.send_json({
                                "event": "error",
                                "message": (
                                    "Could not connect to voice AI service"
                                ),
                            })
                            continue

                        # Send session info
                        safe_print(
                            f"[VOICE] [OK] Session started: "
                            f"{session.session_id}"
                        )
                        await websocket.send_json({
                            "event": "session_started",
                            "session_id": session.session_id,
                        })

                        # Send welcome message with TTS
                        safe_print("[VOICE] Sending welcome message + TTS...")
                        await session.start()
                        safe_print(
                            "[VOICE] Welcome message sent. "
                            "Entering main loop."
                        )
                        break

                    elif event in ("stop", "end_call"):
                        await websocket.close()
                        return

                except json.JSONDecodeError:
                    pass

            elif "bytes" in raw:
                # Audio received before start - ignore
                pass

        # Main loop: receive audio and control messages
        while session and session.is_active:
            raw = await websocket.receive()

            if "bytes" in raw:
                # Audio data from browser microphone -> OpenAI Realtime
                # Only forward after welcome message is done to prevent
                # ambient noise triggering a duplicate greeting
                if not session._ready_for_audio:
                    continue
                audio_data = raw["bytes"]
                if audio_data and len(audio_data) > 0:
                    await session.send_audio_to_openai(audio_data)

            elif "text" in raw:
                try:
                    msg = json.loads(raw["text"])
                    event = msg.get("event", "")

                    if event in ("stop", "end_call"):
                        session.is_active = False
                        break

                    elif event == "language":
                        session.language_preference = msg.get("value", "hinglish")

                    elif event == "text_message":
                        # Text fallback: user typed a message
                        text = msg.get("text", "").strip()
                        if text:
                            # Send as a conversation item to OpenAI Realtime
                            # Clean timecodes out of typed text too
                            text_clean = _remove_timecodes(text)
                            await session._send_to_openai({
                                "type": "conversation.item.create",
                                "item": {
                                    "type": "message",
                                    "role": "user",
                                    "content": [
                                        {
                                            "type": "input_text",
                                            "text": text_clean,
                                        }
                                    ],
                                },
                            })
                            # Trigger a response
                            await session._send_to_openai({
                                "type": "response.create",
                            })

                except json.JSONDecodeError:
                    pass

    except WebSocketDisconnect:
        logger.info("Voice agent WebSocket disconnected")
    except Exception as e:
        logger.error(f"Voice agent WebSocket error: {e}")
    finally:
        if session:
            await session.cleanup()
