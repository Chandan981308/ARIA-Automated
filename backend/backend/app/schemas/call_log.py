from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class CallStatusEnum(str, Enum):
    INITIATED = "initiated"
    RINGING = "ringing"
    ANSWERED = "answered"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"
    BUSY = "busy"


class ClassificationEnum(str, Enum):
    COLD = "cold"
    WARM = "warm"
    HOT = "hot"


class CallLogCreate(BaseModel):
    lead_id: int
    campaign_id: Optional[int] = None
    call_id: Optional[str] = None
    status: CallStatusEnum = CallStatusEnum.INITIATED


class CallLogUpdate(BaseModel):
    status: Optional[CallStatusEnum] = None
    duration: Optional[int] = None
    recording_url: Optional[str] = None
    transcript_url: Optional[str] = None
    transcript_text: Optional[str] = None
    classification: Optional[ClassificationEnum] = None
    sentiment_score: Optional[float] = None
    call_outcome: Optional[str] = None
    call_summary: Optional[str] = None
    ended_at: Optional[datetime] = None


class CallLogResponse(BaseModel):
    id: int
    lead_id: int
    call_id: Optional[str] = None
    campaign_id: Optional[int] = None
    status: Optional[CallStatusEnum] = None
    duration: Optional[int] = None
    recording_url: Optional[str] = None
    transcript_url: Optional[str] = None
    transcript_text: Optional[str] = None
    classification: Optional[ClassificationEnum] = None
    sentiment_score: Optional[float] = None
    call_outcome: Optional[str] = None
    call_summary: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime

    # Related data
    lead_name: Optional[str] = None
    lead_phone: Optional[str] = None
    campaign_name: Optional[str] = None

    class Config:
        from_attributes = True


class CallLogListResponse(BaseModel):
    calls: List[CallLogResponse]
    total: int
    page: int
    page_size: int


class LiveCallResponse(BaseModel):
    call_id: str
    lead_id: int
    lead_name: str
    lead_phone: str
    plot_name: Optional[str] = None
    campaign_name: Optional[str] = None
    state: str  # Current conversation state
    duration: int  # seconds
    last_transcript: str
    started_at: datetime
