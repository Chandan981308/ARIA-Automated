from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class ComplianceEventTypeEnum(str, Enum):
    CONSENT_CAPTURED = "consent_captured"
    OPT_OUT_REQUESTED = "opt_out_requested"
    DLT_CHECK = "dlt_check"
    TIME_WINDOW_VIOLATION = "time_window_violation"
    DATA_ERASURE_REQUEST = "data_erasure_request"
    DATA_ERASURE_COMPLETED = "data_erasure_completed"


class ComplianceLogCreate(BaseModel):
    event_type: ComplianceEventTypeEnum
    lead_id: Optional[int] = None
    call_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class ComplianceLogResponse(BaseModel):
    id: int
    event_type: ComplianceEventTypeEnum
    lead_id: Optional[int] = None
    call_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    lead_name: Optional[str] = None

    class Config:
        from_attributes = True


class ComplianceLogListResponse(BaseModel):
    logs: List[ComplianceLogResponse]
    total: int
    page: int
    page_size: int


class ComplianceStatus(BaseModel):
    trai_compliant: bool = True
    dpdp_compliant: bool = True
    dlt_registration_status: str = "Active"
    dlt_expiry_date: Optional[datetime] = None
    calling_window_violations_30d: int = 0
    opt_out_requests_30d: int = 0
    pending_erasure_requests: int = 0
    erasure_due_date: Optional[datetime] = None
    data_encryption_status: str = "Active"
    consent_records_count: int = 0
    recordings_within_policy: int = 0
    last_audit_date: Optional[datetime] = None


class OptOutRequest(BaseModel):
    lead_id: int
    reason: Optional[str] = None


class ErasureRequest(BaseModel):
    lead_id: int
    reason: Optional[str] = None
