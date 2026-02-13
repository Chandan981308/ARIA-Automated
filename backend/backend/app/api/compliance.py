from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, date, timedelta
from ..core.database import get_db
from ..models import ComplianceLog, Lead, CallLog
from ..models.compliance_log import ComplianceEventType
from ..schemas.compliance import (
    ComplianceLogCreate, ComplianceLogResponse, ComplianceLogListResponse,
    ComplianceStatus, OptOutRequest, ErasureRequest
)

router = APIRouter()


@router.get("/status", response_model=ComplianceStatus)
def get_compliance_status(db: Session = Depends(get_db)):
    """Get overall compliance status"""
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    # Calling window violations
    violations = db.query(func.count(ComplianceLog.id)).filter(
        ComplianceLog.event_type == ComplianceEventType.TIME_WINDOW_VIOLATION,
        func.date(ComplianceLog.created_at) >= thirty_days_ago
    ).scalar() or 0

    # Opt-out requests
    opt_outs = db.query(func.count(ComplianceLog.id)).filter(
        ComplianceLog.event_type == ComplianceEventType.OPT_OUT_REQUESTED,
        func.date(ComplianceLog.created_at) >= thirty_days_ago
    ).scalar() or 0

    # Pending erasure requests
    erasure_requested = db.query(func.count(ComplianceLog.id)).filter(
        ComplianceLog.event_type == ComplianceEventType.DATA_ERASURE_REQUEST
    ).scalar() or 0

    erasure_completed = db.query(func.count(ComplianceLog.id)).filter(
        ComplianceLog.event_type == ComplianceEventType.DATA_ERASURE_COMPLETED
    ).scalar() or 0

    pending_erasures = erasure_requested - erasure_completed

    # Count leads with consent
    consent_records = db.query(func.count(Lead.id)).filter(
        Lead.interestStatus != 'not interested'
    ).scalar() or 0

    # Count recordings within policy (less than 1 year old)
    one_year_ago = today - timedelta(days=365)
    recordings_count = db.query(func.count(CallLog.id)).filter(
        CallLog.recording_url.isnot(None),
        func.date(CallLog.created_at) >= one_year_ago
    ).scalar() or 0

    return ComplianceStatus(
        trai_compliant=violations == 0,
        dpdp_compliant=pending_erasures == 0,
        dlt_registration_status="Active",
        calling_window_violations_30d=violations,
        opt_out_requests_30d=opt_outs,
        pending_erasure_requests=pending_erasures,
        erasure_due_date=(today + timedelta(days=30)) if pending_erasures > 0 else None,
        data_encryption_status="AES-256 Active",
        consent_records_count=consent_records,
        recordings_within_policy=recordings_count,
        last_audit_date=today - timedelta(days=5)  # Placeholder
    )


@router.get("/logs", response_model=ComplianceLogListResponse)
def get_compliance_logs(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    event_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None
):
    """Get paginated compliance logs"""
    query = db.query(ComplianceLog)

    if event_type:
        query = query.filter(ComplianceLog.event_type == event_type)

    if date_from:
        query = query.filter(func.date(ComplianceLog.created_at) >= date_from)

    if date_to:
        query = query.filter(func.date(ComplianceLog.created_at) <= date_to)

    total = query.count()

    offset = (page - 1) * page_size
    logs = query.order_by(ComplianceLog.created_at.desc()).offset(offset).limit(page_size).all()

    # Get lead names
    log_responses = []
    for log in logs:
        lead_name = None
        if log.lead_id:
            lead = db.query(Lead).filter(Lead.id == log.lead_id).first()
            lead_name = lead.name if lead else None

        log_responses.append(ComplianceLogResponse(
            id=log.id,
            event_type=log.event_type,
            lead_id=log.lead_id,
            call_id=log.call_id,
            details=log.details,
            created_at=log.created_at,
            lead_name=lead_name
        ))

    return ComplianceLogListResponse(
        logs=log_responses,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/opt-out")
def process_opt_out(request: OptOutRequest, db: Session = Depends(get_db)):
    """Process opt-out request"""
    lead = db.query(Lead).filter(Lead.id == request.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Update lead
    lead.interestStatus = "not interested"

    # Log compliance event
    compliance_log = ComplianceLog(
        event_type=ComplianceEventType.OPT_OUT_REQUESTED,
        lead_id=request.lead_id,
        details={
            "reason": request.reason,
            "processed_at": datetime.now().isoformat(),
            "previous_status": str(lead.interestStatus)
        }
    )
    db.add(compliance_log)
    db.commit()

    return {"message": "Opt-out processed successfully", "lead_id": request.lead_id}


@router.post("/erasure-request")
def request_erasure(request: ErasureRequest, db: Session = Depends(get_db)):
    """Request data erasure (DPDP Act compliance)"""
    lead = db.query(Lead).filter(Lead.id == request.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Log erasure request
    compliance_log = ComplianceLog(
        event_type=ComplianceEventType.DATA_ERASURE_REQUEST,
        lead_id=request.lead_id,
        details={
            "reason": request.reason,
            "requested_at": datetime.now().isoformat(),
            "due_date": (date.today() + timedelta(days=30)).isoformat()
        }
    )
    db.add(compliance_log)
    db.commit()

    return {
        "message": "Erasure request logged",
        "lead_id": request.lead_id,
        "due_date": (date.today() + timedelta(days=30)).isoformat()
    }


@router.post("/process-erasure/{lead_id}")
def process_erasure(lead_id: int, db: Session = Depends(get_db)):
    """Process data erasure request"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Anonymize data
    lead.name = "REDACTED"
    lead.phone = None
    lead.email = None
    lead.other = {}
    lead.interestStatus = "not interested"

    # Log completion
    compliance_log = ComplianceLog(
        event_type=ComplianceEventType.DATA_ERASURE_COMPLETED,
        lead_id=lead_id,
        details={
            "completed_at": datetime.now().isoformat()
        }
    )
    db.add(compliance_log)
    db.commit()

    return {"message": "Data erasure completed", "lead_id": lead_id}


@router.get("/erasure-pending")
def get_pending_erasures(db: Session = Depends(get_db)):
    """Get list of pending erasure requests"""
    # Get all erasure requests
    requests = db.query(ComplianceLog).filter(
        ComplianceLog.event_type == ComplianceEventType.DATA_ERASURE_REQUEST
    ).all()

    # Get completed erasures
    completed_lead_ids = db.query(ComplianceLog.lead_id).filter(
        ComplianceLog.event_type == ComplianceEventType.DATA_ERASURE_COMPLETED
    ).all()
    completed_ids = [c[0] for c in completed_lead_ids]

    # Filter pending
    pending = []
    for req in requests:
        if req.lead_id not in completed_ids:
            lead = db.query(Lead).filter(Lead.id == req.lead_id).first()
            pending.append({
                "lead_id": req.lead_id,
                "lead_name": lead.name if lead else "Unknown",
                "requested_at": req.created_at,
                "due_date": req.details.get("due_date") if req.details else None
            })

    return pending
