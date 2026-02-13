"""
Voice Lab API Router — ElevenLabs voice management.

Endpoints:
  GET  /voicelab/voices          — List all available voices from ElevenLabs
  GET  /voicelab/voices/{id}     — Get voice details
  POST /voicelab/voices/clone    — Clone a voice (upload audio sample)
  POST /voicelab/voices/import   — Import a voice by ElevenLabs Voice ID
  DELETE /voicelab/voices/{id}   — Delete a cloned/imported voice
  POST /voicelab/tts/preview     — Preview text-to-speech with a voice
  GET  /voicelab/models          — List available TTS models
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
import requests as http_requests
import json

from ..core.database import get_db
from ..core.config import settings
from ..models.user import User
from .auth import get_current_user

router = APIRouter()

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"


def _get_headers():
    """Get ElevenLabs API headers."""
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="ElevenLabs API key not configured. Set ELEVENLABS_API_KEY in .env file.",
        )
    return {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "Accept": "application/json",
    }


# ============================================================================
# Pydantic models
# ============================================================================

class VoiceImportRequest(BaseModel):
    voice_id: str
    provider: str = "elevenlabs"


class TTSPreviewRequest(BaseModel):
    text: str
    voice_id: str
    model_id: str = "eleven_turbo_v2_5"
    stability: float = 0.35
    similarity_boost: float = 0.75
    style: float = 0.0
    speed: float = 1.0


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/voices")
def list_voices(
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """List all available voices from ElevenLabs."""
    headers = _get_headers()

    try:
        r = http_requests.get(f"{ELEVENLABS_BASE}/voices", headers=headers, timeout=15)
    except http_requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to ElevenLabs: {e}")

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"ElevenLabs error: {r.text}")

    data = r.json()
    voices = data.get("voices", [])

    # Simplify the voice data
    result = []
    for v in voices:
        voice = {
            "voice_id": v.get("voice_id"),
            "name": v.get("name", ""),
            "category": v.get("category", ""),
            "description": v.get("description") or (v.get("labels", {}).get("description", "")),
            "accent": v.get("labels", {}).get("accent", ""),
            "gender": v.get("labels", {}).get("gender", ""),
            "age": v.get("labels", {}).get("age", ""),
            "language": v.get("labels", {}).get("language", ""),
            "use_case": v.get("labels", {}).get("use_case", ""),
            "preview_url": v.get("preview_url", ""),
            "is_cloned": v.get("category") == "cloned",
            "is_professional": v.get("category") == "professional",
            "provider": "elevenlabs",
        }
        result.append(voice)

    # Apply search filter
    if search:
        search_lower = search.lower()
        result = [
            v for v in result
            if search_lower in v["name"].lower()
            or search_lower in v.get("accent", "").lower()
            or search_lower in v.get("language", "").lower()
            or search_lower in v.get("gender", "").lower()
            or search_lower in v.get("description", "").lower()
        ]

    return {
        "voices": result,
        "total": len(result),
    }


@router.get("/voices/{voice_id}")
def get_voice(
    voice_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get detailed info about a specific voice."""
    headers = _get_headers()

    try:
        r = http_requests.get(f"{ELEVENLABS_BASE}/voices/{voice_id}", headers=headers, timeout=15)
    except http_requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to ElevenLabs: {e}")

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"ElevenLabs error: {r.text}")

    v = r.json()
    return {
        "voice_id": v.get("voice_id"),
        "name": v.get("name", ""),
        "category": v.get("category", ""),
        "description": v.get("description") or (v.get("labels", {}).get("description", "")),
        "accent": v.get("labels", {}).get("accent", ""),
        "gender": v.get("labels", {}).get("gender", ""),
        "age": v.get("labels", {}).get("age", ""),
        "language": v.get("labels", {}).get("language", ""),
        "use_case": v.get("labels", {}).get("use_case", ""),
        "preview_url": v.get("preview_url", ""),
        "settings": v.get("settings", {}),
        "samples": v.get("samples", []),
    }


@router.post("/voices/clone")
async def clone_voice(
    name: str = Form(...),
    description: str = Form(""),
    language: str = Form("en"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Clone a voice by uploading an audio sample."""
    headers = _get_headers()
    # Remove Accept header for multipart
    headers.pop("Accept", None)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Read the uploaded file
    file_content = await file.read()

    files = {
        "files": (file.filename, file_content, file.content_type or "audio/mpeg"),
    }
    form_data = {
        "name": name,
        "description": description,
        "labels": json.dumps({"language": language}),
    }

    try:
        r = http_requests.post(
            f"{ELEVENLABS_BASE}/voices/add",
            headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            data=form_data,
            files=files,
            timeout=60,
        )
    except http_requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to clone voice: {e}")

    if r.status_code not in (200, 201):
        raise HTTPException(status_code=r.status_code, detail=f"ElevenLabs clone error: {r.text}")

    data = r.json()
    return {
        "message": f"Voice '{name}' cloned successfully",
        "voice_id": data.get("voice_id"),
        "name": name,
    }


@router.post("/voices/import")
def import_voice(
    data: VoiceImportRequest,
    current_user: User = Depends(get_current_user),
):
    """Import a voice by its ElevenLabs Voice ID — verifies it exists."""
    headers = _get_headers()

    # Verify the voice exists
    try:
        r = http_requests.get(
            f"{ELEVENLABS_BASE}/voices/{data.voice_id}",
            headers=headers,
            timeout=15,
        )
    except http_requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to verify voice: {e}")

    if r.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Voice ID '{data.voice_id}' not found on ElevenLabs")
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"ElevenLabs error: {r.text}")

    v = r.json()
    return {
        "message": f"Voice '{v.get('name', '')}' imported successfully",
        "voice_id": v.get("voice_id"),
        "name": v.get("name", ""),
        "category": v.get("category", ""),
        "preview_url": v.get("preview_url", ""),
    }


@router.delete("/voices/{voice_id}")
def delete_voice(
    voice_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a cloned voice from ElevenLabs."""
    headers = _get_headers()

    try:
        r = http_requests.delete(f"{ELEVENLABS_BASE}/voices/{voice_id}", headers=headers, timeout=15)
    except http_requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to delete voice: {e}")

    if r.status_code not in (200, 204):
        raise HTTPException(status_code=r.status_code, detail=f"ElevenLabs error: {r.text}")

    return {"message": "Voice deleted successfully", "voice_id": voice_id}


@router.get("/models")
def list_models(
    current_user: User = Depends(get_current_user),
):
    """List available ElevenLabs TTS models."""
    headers = _get_headers()

    try:
        r = http_requests.get(f"{ELEVENLABS_BASE}/models", headers=headers, timeout=15)
    except http_requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch models: {e}")

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"ElevenLabs error: {r.text}")

    models = r.json()
    result = []
    for m in models:
        result.append({
            "model_id": m.get("model_id"),
            "name": m.get("name", ""),
            "description": m.get("description", ""),
            "can_do_text_to_speech": m.get("can_do_text_to_speech", False),
            "can_do_voice_conversion": m.get("can_do_voice_conversion", False),
            "languages": [
                {"language_id": lang.get("language_id"), "name": lang.get("name")}
                for lang in m.get("languages", [])
            ],
        })

    return {"models": result, "total": len(result)}


@router.get("/subscription")
def get_subscription(
    current_user: User = Depends(get_current_user),
):
    """Get ElevenLabs subscription/usage info."""
    headers = _get_headers()

    try:
        r = http_requests.get(f"{ELEVENLABS_BASE}/user/subscription", headers=headers, timeout=15)
    except http_requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch subscription: {e}")

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"ElevenLabs error: {r.text}")

    data = r.json()
    return {
        "tier": data.get("tier", ""),
        "character_count": data.get("character_count", 0),
        "character_limit": data.get("character_limit", 0),
        "voice_limit": data.get("voice_limit", 0),
        "can_extend_character_limit": data.get("can_extend_character_limit", False),
        "allowed_to_extend_character_limit": data.get("allowed_to_extend_character_limit", False),
        "available_models": data.get("available_models", []),
    }
