'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  language?: string;
  is_on_topic?: boolean;
}

export type CallState = 'idle' | 'connecting' | 'active' | 'error';
export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface UseVoiceAgentReturn {
  // State
  callState: CallState;
  agentState: AgentState;
  isUserSpeaking: boolean;
  isMuted: boolean;
  liveTranscript: string;
  messages: VoiceMessage[];
  callDuration: number;
  error: string | null;
  volume: number;

  // Actions
  startCall: (languagePreference?: string) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  sendTextMessage: (text: string) => void;
}

// ============================================================================
// Audio Processor - Convert to Linear16 PCM for Deepgram
// ============================================================================

class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private onAudioData: ((data: ArrayBuffer) => void) | null = null;
  private onVolumeChange: ((volume: number) => void) | null = null;

  // Voice Activity Detection — lightweight gate to reject dead silence
  // OpenAI server_vad (backend) does the real speech detection at threshold 0.80
  // Frontend gate is intentionally PERMISSIVE — just filters out pure silence/very low noise
  private readonly VOICE_RMS_THRESHOLD = 0.008;    // Very low — just above dead silence
  private readonly SILENCE_FRAMES_CUTOFF = 25;     // ~1.5s of silence before stopping send (generous)
  private silenceFrameCount = 0;
  private isSendingAudio = false;
  private noiseFloor = 0;                          // Adaptive noise floor
  private readonly NOISE_ADAPT_RATE = 0.03;        // Slow noise floor adaptation

  async start(
    onAudioData: (data: ArrayBuffer) => void,
    onVolumeChange: (volume: number) => void
  ): Promise<void> {
    this.onAudioData = onAudioData;
    this.onVolumeChange = onVolumeChange;

    // Request microphone access with strict noise suppression
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Create audio context at 16kHz
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Analyser for frequency-based voice detection
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 1024;  // Higher FFT = better frequency resolution
    this.analyserNode.smoothingTimeConstant = 0.3;  // Less smoothing = faster response
    this.sourceNode.connect(this.analyserNode);

    // Processor to capture PCM data
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    this.processorNode.onaudioprocess = (event) => {
      if (!this.onAudioData) return;

      const inputData = event.inputBuffer.getChannelData(0);

      // Calculate RMS energy of this audio frame
      let sumSquares = 0;
      for (let i = 0; i < inputData.length; i++) {
        sumSquares += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sumSquares / inputData.length);

      // Adaptive noise floor: slowly track ambient noise level when not sending
      if (!this.isSendingAudio) {
        this.noiseFloor = this.noiseFloor * (1 - this.NOISE_ADAPT_RATE) + rms * this.NOISE_ADAPT_RATE;
      }

      // Simple gate: RMS must be above dead silence threshold OR above noise floor
      // This is intentionally permissive — OpenAI server_vad (0.80) does real speech detection
      const isAboveGate = rms > Math.max(this.VOICE_RMS_THRESHOLD, this.noiseFloor * 1.8);

      if (isAboveGate) {
        this.silenceFrameCount = 0;
        this.isSendingAudio = true;
      } else {
        this.silenceFrameCount++;
        if (this.silenceFrameCount > this.SILENCE_FRAMES_CUTOFF) {
          this.isSendingAudio = false;
        }
      }

      if (!this.isSendingAudio) return;

      // Convert Float32 to Int16 (Linear16 PCM)
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      this.onAudioData(pcmData.buffer);
    };

    // Volume monitoring loop
    this.monitorVolume();
  }

  private monitorVolume() {
    if (!this.analyserNode || !this.onVolumeChange) return;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const check = () => {
      if (!this.analyserNode) return;
      this.analyserNode.getByteFrequencyData(dataArray);

      // Simple average across all frequency bins for volume indicator
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = dataArray.length > 0 ? sum / dataArray.length : 0;
      const normalized = Math.min(avg / 128, 1);
      this.onVolumeChange?.(normalized);
      if (this.audioContext?.state === 'running') {
        requestAnimationFrame(check);
      }
    };
    check();
  }

  mute() {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((t) => (t.enabled = false));
    }
  }

  unmute() {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((t) => (t.enabled = true));
    }
  }

  stop() {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.onAudioData = null;
    this.onVolumeChange = null;
  }
}

// ============================================================================
// Audio Player - Low-Latency Streaming PCM16 Playback (24kHz mono)
// Uses Web Audio API to decode raw PCM16 (Int16LE) directly — no codec needed
// Starts playing as soon as first chunk arrives, doesn't wait for all data
// ============================================================================

class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private onPlaybackEnd: (() => void) | null = null;
  private isPlaying = false;
  private streamDone = false;

  // PCM buffer: accumulate raw Int16 samples, flush to AudioBuffer when enough
  private pcmBuffer: Int16Array[] = [];
  private pcmBufferedBytes = 0;

  // Scheduling: schedule AudioBufferSourceNodes back-to-back for gapless playback
  private nextPlayTime = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];

  // PCM format from ElevenLabs pcm_24000
  private readonly SAMPLE_RATE = 24000;

  // Volume boost — ElevenLabs PCM output is often quiet
  private readonly VOLUME_GAIN = 2.5;

  // Minimum PCM bytes before scheduling a play segment (~170ms at 24kHz = 8192 bytes)
  private readonly MIN_BUFFER_BYTES = 8192;

  private _ensureContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
      // Create gain node for volume boost
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.VOLUME_GAIN;
      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setOnPlaybackEnd(cb: () => void) {
    this.onPlaybackEnd = cb;
  }

  addChunk(chunk: ArrayBuffer) {
    // Incoming chunk is raw PCM16 (Int16, little-endian) from ElevenLabs
    const int16 = new Int16Array(chunk);
    this.pcmBuffer.push(int16);
    this.pcmBufferedBytes += chunk.byteLength;

    // Auto-flush when we have enough buffered PCM data
    if (this.pcmBufferedBytes >= this.MIN_BUFFER_BYTES) {
      this._flushPcmBuffer();
    }
  }

  private _flushPcmBuffer() {
    if (this.pcmBuffer.length === 0) return;

    const ctx = this._ensureContext();

    // Combine all buffered Int16 samples into one array
    const totalSamples = this.pcmBuffer.reduce((acc, arr) => acc + arr.length, 0);
    const combined = new Int16Array(totalSamples);
    let offset = 0;
    for (const arr of this.pcmBuffer) {
      combined.set(arr, offset);
      offset += arr.length;
    }
    this.pcmBuffer = [];
    this.pcmBufferedBytes = 0;

    // Convert Int16 (-32768..32767) to Float32 (-1.0..1.0)
    const float32 = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      float32[i] = combined[i] / 32768;
    }

    // Create AudioBuffer and fill it
    const audioBuffer = ctx.createBuffer(1, totalSamples, this.SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32);

    // Schedule playback through gain node for volume boost
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode || ctx.destination);

    // Schedule gapless: play right after previous segment ends
    const now = ctx.currentTime;
    if (this.nextPlayTime < now) {
      this.nextPlayTime = now;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;

    this.isPlaying = true;
    this.activeSourceNodes.push(source);

    // When this source ends, clean it up
    source.onended = () => {
      const idx = this.activeSourceNodes.indexOf(source);
      if (idx >= 0) this.activeSourceNodes.splice(idx, 1);

      // If stream is done AND no more sources are playing, signal end
      if (this.streamDone && this.activeSourceNodes.length === 0 && this.pcmBuffer.length === 0) {
        this.isPlaying = false;
        this.onPlaybackEnd?.();
        this._resetState();
      }
    };
  }

  // Called on agent_audio_end — flush remaining PCM and mark done
  streamEnd() {
    this._flushPcmBuffer();
    this.streamDone = true;

    // If nothing is scheduled/playing, signal end immediately
    if (this.activeSourceNodes.length === 0) {
      this.isPlaying = false;
      this.onPlaybackEnd?.();
      this._resetState();
    }
  }

  // Legacy method kept for compatibility
  async playAll() {
    this.streamEnd();
  }

  private _resetState() {
    this.isPlaying = false;
    this.streamDone = false;
    this.pcmBuffer = [];
    this.pcmBufferedBytes = 0;
    this.nextPlayTime = 0;
    this.activeSourceNodes = [];
  }

  stop() {
    // Stop all active source nodes immediately
    for (const src of this.activeSourceNodes) {
      try { src.stop(); } catch (e) {}
    }
    this.pcmBuffer = [];
    this.pcmBufferedBytes = 0;
    this._resetState();
  }
}

// ============================================================================
// Main Hook
// ============================================================================

export function useVoiceAgent(): UseVoiceAgentReturn {
  const [callState, setCallState] = useState<CallState>('idle');
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const audioPlayerRef = useRef<AudioPlayer>(new AudioPlayer());
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const msgIdRef = useRef(0);
  const isMutedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    // Stop audio recording
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
      audioProcessorRef.current = null;
    }

    // Stop audio playback
    audioPlayerRef.current.stop();

    // Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string, extra?: Partial<VoiceMessage>) => {
    const msg: VoiceMessage = {
      id: `msg_${++msgIdRef.current}`,
      role,
      content,
      timestamp: new Date(),
      ...extra,
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  // ---- Handle server messages ----
  const handleServerMessage = useCallback((msg: any) => {
    switch (msg.event) {
      case 'session_started':
        // Session initialized
        break;

      case 'transcript':
        if (msg.is_final) {
          // Final transcript - add as user message
          if (msg.text?.trim()) {
            addMessage('user', msg.text.trim());
          }
          setLiveTranscript('');
        } else {
          // Interim transcript - show live
          setLiveTranscript(msg.text || '');
        }
        break;

      case 'agent_text':
        // Agent response text - add to messages
        addMessage('assistant', msg.text, {
          language: msg.language,
          is_on_topic: msg.is_on_topic,
        });
        break;

      case 'agent_state':
        setAgentState(msg.state || 'listening');
        break;

      case 'agent_audio_stop':
        // BARGE-IN: User interrupted agent, stop audio immediately
        audioPlayerRef.current.stop();
        break;

      case 'agent_audio_end':
        // TTS stream finished — flush remaining chunks and finish playback
        audioPlayerRef.current.setOnPlaybackEnd(() => {
          // Audio done playing, back to listening
        });
        audioPlayerRef.current.streamEnd();
        break;

      case 'agent_audio_chunk_start':
        // A new TTS sentence chunk is starting (informational)
        break;

      case 'agent_audio_chunk_end':
        // A TTS sentence chunk finished (informational)
        break;

      case 'error':
        setError(msg.message || 'An error occurred');
        break;

      default:
        break;
    }
  }, [addMessage]);

  // ---- Start Call ----
  const startCall = useCallback(async (languagePreference: string = 'hinglish') => {
    setError(null);
    setCallState('connecting');
    setMessages([]);
    setCallDuration(0);
    setLiveTranscript('');

    try {
      // 1. Open WebSocket FIRST (fast, no user interaction needed)
      const token = localStorage.getItem('token') || '';
      const wsUrl = `ws://localhost:8000/ws/voice-agent?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('WebSocket connection failed'));
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
      });

      // 2. Set up WebSocket message handler
      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          // Binary = TTS audio chunk
          const buffer = await event.data.arrayBuffer();
          audioPlayerRef.current.addChunk(buffer);
        } else {
          // JSON = control message
          try {
            const msg = JSON.parse(event.data);
            handleServerMessage(msg);
          } catch (e) {}
        }
      };

      ws.onclose = () => {
        setCallState('idle');
        setAgentState('idle');
        cleanup();
      };

      ws.onerror = () => {
        setError('Connection lost. Please try again.');
        setCallState('error');
      };

      // 3. Send start event — triggers welcome message + TTS
      ws.send(JSON.stringify({
        event: 'start',
        language: languagePreference,
      }));

      // 4. Set call as active IMMEDIATELY
      setCallState('active');
      setAgentState('listening');

      // 5. Start duration timer
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // 6. Start microphone in background (non-blocking)
      // If mic fails, text fallback still works
      try {
        const processor = new AudioProcessor();
        audioProcessorRef.current = processor;

        await processor.start(
          (audioData) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isMutedRef.current) {
              wsRef.current.send(audioData);
            }
          },
          (vol) => {
            setVolume(vol);
            setIsUserSpeaking(vol > 0.02);
          }
        );
      } catch (micErr: any) {
        console.warn('Microphone not available:', micErr.message);
        // Don't fail the call — user can still use text input
        if (micErr.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone permission in your browser and try again.');
        }
      }

    } catch (err: any) {
      console.error('Start call failed:', err);

      let errorMsg = 'Failed to start call.';
      if (err.message?.includes('WebSocket')) {
        errorMsg = 'Cannot connect to server. Please make sure the backend is running.';
      }

      setError(errorMsg);
      setCallState('error');
      cleanup();
    }
  }, [cleanup, handleServerMessage]);

  // ---- End Call ----
  const endCall = useCallback(() => {
    // Send stop event to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'stop' }));
    }

    cleanup();
    setCallState('idle');
    setAgentState('idle');
    setIsUserSpeaking(false);
    setLiveTranscript('');
    setVolume(0);
  }, [cleanup]);

  // ---- Toggle Mute ----
  const toggleMute = useCallback(() => {
    if (audioProcessorRef.current) {
      if (isMuted) {
        audioProcessorRef.current.unmute();
      } else {
        audioProcessorRef.current.mute();
      }
    }
    setIsMuted((prev) => {
      isMutedRef.current = !prev;
      return !prev;
    });
  }, [isMuted]);

  // ---- Send Text Message (fallback) ----
  const sendTextMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    // Add as user message
    addMessage('user', text.trim());

    // If WebSocket is connected, send as text for LLM processing
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'text_message',
        text: text.trim(),
      }));
    }
  }, [addMessage]);

  return {
    callState,
    agentState,
    isUserSpeaking,
    isMuted,
    liveTranscript,
    messages,
    callDuration,
    error,
    volume,
    startCall,
    endCall,
    toggleMute,
    sendTextMessage,
  };
}
