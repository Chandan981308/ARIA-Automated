from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from ..core.database import get_db
from ..core.config import settings

router = APIRouter()


class CallingSettings(BaseModel):
    calling_hours_start: str = "09:00"
    calling_hours_end: str = "21:00"
    concurrent_call_limit: int = 50
    default_retry_attempts: int = 3
    retry_interval_hours: int = 4


class VoiceSettings(BaseModel):
    voice_type: str = "female_indian_neutral"
    speaking_rate: float = 1.0
    max_call_duration_minutes: int = 8
    silence_threshold_seconds: int = 3


class NotificationSettings(BaseModel):
    hot_lead_notifications: bool = True
    daily_summary_email: bool = True
    compliance_alerts: bool = True
    system_downtime_alerts: bool = False


class AssignmentSettings(BaseModel):
    assignment_mode: str = "round_robin"  # round_robin, workload_based
    auto_assignment: bool = True
    working_hours_start: str = "10:00"
    working_hours_end: str = "19:00"


class AppSettings(BaseModel):
    calling: CallingSettings = CallingSettings()
    voice: VoiceSettings = VoiceSettings()
    notifications: NotificationSettings = NotificationSettings()
    assignment: AssignmentSettings = AssignmentSettings()


# In-memory settings store (in production, use database or Redis)
_settings_store = {
    "calling": CallingSettings().model_dump(),
    "voice": VoiceSettings().model_dump(),
    "notifications": NotificationSettings().model_dump(),
    "assignment": AssignmentSettings().model_dump()
}


@router.get("")
def get_all_settings():
    """Get all settings"""
    return _settings_store


@router.get("/calling", response_model=CallingSettings)
def get_calling_settings():
    """Get calling configuration"""
    return CallingSettings(**_settings_store["calling"])


@router.put("/calling", response_model=CallingSettings)
def update_calling_settings(settings_data: CallingSettings):
    """Update calling configuration"""
    _settings_store["calling"] = settings_data.model_dump()
    return settings_data


@router.get("/voice", response_model=VoiceSettings)
def get_voice_settings():
    """Get voice and conversation settings"""
    return VoiceSettings(**_settings_store["voice"])


@router.put("/voice", response_model=VoiceSettings)
def update_voice_settings(settings_data: VoiceSettings):
    """Update voice and conversation settings"""
    _settings_store["voice"] = settings_data.model_dump()
    return settings_data


@router.get("/notifications", response_model=NotificationSettings)
def get_notification_settings():
    """Get notification settings"""
    return NotificationSettings(**_settings_store["notifications"])


@router.put("/notifications", response_model=NotificationSettings)
def update_notification_settings(settings_data: NotificationSettings):
    """Update notification settings"""
    _settings_store["notifications"] = settings_data.model_dump()
    return settings_data


@router.get("/assignment", response_model=AssignmentSettings)
def get_assignment_settings():
    """Get assignment settings"""
    return AssignmentSettings(**_settings_store["assignment"])


@router.put("/assignment", response_model=AssignmentSettings)
def update_assignment_settings(settings_data: AssignmentSettings):
    """Update assignment settings"""
    _settings_store["assignment"] = settings_data.model_dump()
    return settings_data


@router.get("/voice/options")
def get_voice_options():
    """Get available voice options"""
    return [
        {"id": "female_indian_neutral", "name": "Female - Indian Neutral", "language": "en-IN"},
        {"id": "male_indian_neutral", "name": "Male - Indian Neutral", "language": "en-IN"},
        {"id": "female_indian_hindi", "name": "Female - Hindi Accent", "language": "hi-IN"},
        {"id": "male_indian_hindi", "name": "Male - Hindi Accent", "language": "hi-IN"}
    ]


@router.get("/scripts")
def get_scripts():
    """Get available sales scripts"""
    return [
        {"id": 1, "name": "Default Residential v2.1", "last_modified": "2026-01-20"},
        {"id": 2, "name": "Commercial Properties v1.5", "last_modified": "2026-01-15"},
        {"id": 3, "name": "Industrial Land v1.0", "last_modified": "2026-01-10"}
    ]
