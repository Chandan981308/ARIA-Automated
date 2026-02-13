from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, date, timedelta
from ..core.database import get_db
from ..models import CallLog, Lead, Campaign
from ..schemas.call_log import (
    CallLogCreate, CallLogUpdate, CallLogResponse,
    CallLogListResponse, LiveCallResponse
)

router = APIRouter()


def get_call_response(call: CallLog, db: Session) -> CallLogResponse:
    """Convert CallLog model to response"""
    return CallLogResponse(
        id=call.id,
        lead_id=call.lead_id,
        call_id=call.call_id,
        campaign_id=call.campaign_id,
        status=call.status,
        duration=call.duration,
        recording_url=call.recording_url,
        transcript_url=call.transcript_url,
        transcript_text=call.transcript_text,
        classification=call.classification,
        sentiment_score=float(call.sentiment_score) if call.sentiment_score else None,
        call_outcome=call.call_outcome,
        call_summary=call.call_summary,
        started_at=call.started_at,
        ended_at=call.ended_at,
        created_at=call.created_at,
        lead_name=call.lead.name if call.lead else None,
        lead_phone=call.lead.phone if call.lead else None,
        campaign_name=call.campaign.name if call.campaign else None
    )


@router.get("", response_model=CallLogListResponse)
def get_calls(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    lead_id: Optional[int] = None,
    campaign_id: Optional[int] = None,
    classification: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None
):
    """Get paginated list of call logs"""
    query = db.query(CallLog).options(
        joinedload(CallLog.lead),
        joinedload(CallLog.campaign)
    )

    if lead_id:
        query = query.filter(CallLog.lead_id == lead_id)

    if campaign_id:
        query = query.filter(CallLog.campaign_id == campaign_id)

    if classification:
        query = query.filter(CallLog.classification == classification)

    if status:
        query = query.filter(CallLog.status == status)

    if date_from:
        query = query.filter(func.date(CallLog.created_at) >= date_from)

    if date_to:
        query = query.filter(func.date(CallLog.created_at) <= date_to)

    if search:
        query = query.join(Lead).filter(
            (Lead.name.ilike(f"%{search}%")) |
            (Lead.phone.ilike(f"%{search}%"))
        )

    total = query.count()

    # Apply pagination
    offset = (page - 1) * page_size
    calls = query.order_by(CallLog.created_at.desc()).offset(offset).limit(page_size).all()

    return CallLogListResponse(
        calls=[get_call_response(c, db) for c in calls],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/live")
def get_live_calls(db: Session = Depends(get_db)):
    """Get currently active calls"""
    # In real implementation, this would query Redis or a real-time service
    active_calls = db.query(CallLog).options(
        joinedload(CallLog.lead),
        joinedload(CallLog.campaign)
    ).filter(
        CallLog.status.in_(["initiated", "ringing", "answered"]),
        CallLog.ended_at.is_(None)
    ).order_by(CallLog.started_at.desc()).all()

    return [
        {
            "call_id": c.call_id or str(c.id),
            "lead_id": c.lead_id,
            "lead_name": c.lead.name if c.lead else "Unknown",
            "lead_phone": c.lead.phone if c.lead else "Unknown",
            "campaign_name": c.campaign.name if c.campaign else None,
            "status": c.status,
            "duration": (datetime.now() - c.started_at).seconds if c.started_at else 0,
            "started_at": c.started_at
        } for c in active_calls
    ]


@router.get("/{call_id}", response_model=CallLogResponse)
def get_call(call_id: int, db: Session = Depends(get_db)):
    """Get a single call log"""
    call = db.query(CallLog).options(
        joinedload(CallLog.lead),
        joinedload(CallLog.campaign)
    ).filter(CallLog.id == call_id).first()

    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    return get_call_response(call, db)


@router.get("/{call_id}/recording")
def get_recording(call_id: int, db: Session = Depends(get_db)):
    """Get call recording URL"""
    call = db.query(CallLog).filter(CallLog.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    if not call.recording_url:
        raise HTTPException(status_code=404, detail="Recording not available")

    return {"recording_url": call.recording_url}


@router.get("/{call_id}/transcript")
def get_transcript(call_id: int, db: Session = Depends(get_db)):
    """Get call transcript"""
    call = db.query(CallLog).filter(CallLog.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    return {
        "transcript_url": call.transcript_url,
        "transcript_text": call.transcript_text
    }


@router.post("", response_model=CallLogResponse)
def create_call_log(call_data: CallLogCreate, db: Session = Depends(get_db)):
    """Create a new call log entry"""
    call = CallLog(
        lead_id=call_data.lead_id,
        campaign_id=call_data.campaign_id,
        call_id=call_data.call_id,
        status=call_data.status,
        started_at=datetime.now()
    )
    db.add(call)
    db.commit()
    db.refresh(call)

    return get_call_response(call, db)


@router.put("/{call_id}", response_model=CallLogResponse)
def update_call_log(
    call_id: int,
    call_data: CallLogUpdate,
    db: Session = Depends(get_db)
):
    """Update a call log"""
    call = db.query(CallLog).filter(CallLog.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    update_data = call_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(call, field, value)

    db.commit()
    db.refresh(call)

    return get_call_response(call, db)


@router.post("/{call_id}/transfer")
def transfer_call(call_id: int, user_id: int, db: Session = Depends(get_db)):
    """Transfer call to human agent"""
    call = db.query(CallLog).filter(CallLog.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    # In real implementation, this would trigger the transfer via Tata Tele API
    return {
        "message": "Transfer initiated",
        "call_id": call_id,
        "transfer_to": user_id
    }
