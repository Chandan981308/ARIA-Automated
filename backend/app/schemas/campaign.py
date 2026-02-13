from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, time
from enum import Enum


class CampaignStatusEnum(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class CampaignFilters(BaseModel):
    leadStageIds: Optional[List[int]] = None
    cities: Optional[List[str]] = None
    states: Optional[List[str]] = None
    platformIds: Optional[List[int]] = None
    interestStatus: Optional[str] = None
    maxTracker: Optional[int] = 3
    plotIds: Optional[List[int]] = None


class CampaignBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    filters: Optional[CampaignFilters] = None
    daily_call_limit: int = 500
    calling_hours_start: str = "09:00"
    calling_hours_end: str = "21:00"
    max_attempts_per_lead: int = 3
    retry_interval_hours: int = 4
    priority: str = "medium"


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[CampaignStatusEnum] = None
    filters: Optional[CampaignFilters] = None
    daily_call_limit: Optional[int] = None
    calling_hours_start: Optional[str] = None
    calling_hours_end: Optional[str] = None
    max_attempts_per_lead: Optional[int] = None
    retry_interval_hours: Optional[int] = None
    priority: Optional[str] = None


class CampaignStats(BaseModel):
    total_leads: int = 0
    completed_leads: int = 0
    calls_today: int = 0
    answered_today: int = 0
    hot_leads: int = 0
    warm_leads: int = 0
    cold_leads: int = 0
    avg_duration: float = 0
    answer_rate: float = 0


class CampaignResponse(CampaignBase):
    id: int
    status: CampaignStatusEnum
    total_leads: int
    completed_leads: int
    created_by: Optional[int] = None
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    stats: Optional[CampaignStats] = None

    class Config:
        from_attributes = True


class CampaignListResponse(BaseModel):
    campaigns: List[CampaignResponse]
    total: int
    page: int
    page_size: int
