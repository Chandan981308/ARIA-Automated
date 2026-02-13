from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class InterestStatusEnum(str, Enum):
    INTERESTED = "interested"
    NOT_INTERESTED = "not interested"


class LeadBase(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    platformId: Optional[int] = None
    plotId: Optional[int] = None
    leadStageId: Optional[int] = None
    leadStatusId: Optional[int] = None
    interestStatus: Optional[InterestStatusEnum] = None


class LeadCreate(LeadBase):
    phone: str = Field(..., description="Phone number is required")


class LeadUpdate(LeadBase):
    assignedTo: Optional[int] = None
    tracker: Optional[int] = None
    other: Optional[Dict[str, Any]] = None


class LeadOtherData(BaseModel):
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    preferred_location: Optional[str] = None
    property_type: Optional[str] = None
    timeline: Optional[str] = None
    intent_score: Optional[int] = None
    objections: Optional[List[str]] = None
    next_action: Optional[str] = None
    last_call_date: Optional[datetime] = None
    call_outcome: Optional[str] = None
    consent: Optional[Dict[str, Any]] = None


class LeadResponse(LeadBase):
    id: int
    assignedTo: Optional[int] = None
    tracker: int = 0
    other: Dict[str, Any] = {}
    createdAt: datetime
    updatedAt: datetime

    # Related data
    platform_name: Optional[str] = None
    plot_name: Optional[str] = None
    assigned_user_name: Optional[str] = None
    stage_name: Optional[str] = None
    status_name: Optional[str] = None
    call_count: int = 0
    last_call_date: Optional[datetime] = None
    classification: Optional[str] = None

    class Config:
        from_attributes = True


class LeadListResponse(BaseModel):
    leads: List[LeadResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
