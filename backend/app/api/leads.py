from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import Optional, List
from ..core.database import get_db
from ..models import Lead, CallLog, User, Plot, LeadStage, LeadStatus, Platform
from ..schemas.lead import (
    LeadCreate, LeadUpdate, LeadResponse, LeadListResponse
)

router = APIRouter()


def get_lead_response(lead: Lead, db: Session) -> LeadResponse:
    """Convert Lead model to response with related data"""
    # Get call count and last call
    call_stats = db.query(
        func.count(CallLog.id).label('count'),
        func.max(CallLog.created_at).label('last_call'),
        func.max(CallLog.classification).label('classification')
    ).filter(CallLog.lead_id == lead.id).first()

    return LeadResponse(
        id=lead.id,
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        city=lead.city,
        state=lead.state,
        platformId=lead.platformId,
        plotId=lead.plotId,
        leadStageId=lead.leadStageId,
        leadStatusId=lead.leadStatusId,
        assignedTo=lead.assignedTo,
        tracker=lead.tracker or 0,
        interestStatus=lead.interestStatus,
        other=lead.other or {},
        createdAt=lead.createdAt,
        updatedAt=lead.updatedAt,
        platform_name=lead.platform.name if lead.platform else None,
        plot_name=lead.plot.name if lead.plot else None,
        assigned_user_name=lead.assigned_user.full_name if lead.assigned_user else None,
        stage_name=lead.lead_stage.name if lead.lead_stage else None,
        status_name=lead.lead_status.name if lead.lead_status else None,
        call_count=call_stats.count if call_stats else 0,
        last_call_date=call_stats.last_call if call_stats else None,
        classification=call_stats.classification if call_stats else None
    )


@router.get("", response_model=LeadListResponse)
def get_leads(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    lead_stage_id: Optional[int] = None,
    lead_status_id: Optional[int] = None,
    city: Optional[str] = None,
    platform_id: Optional[int] = None,
    interest_status: Optional[str] = None,
    assigned_to: Optional[int] = None,
    classification: Optional[str] = None,
    sort_by: str = "createdAt",
    sort_order: str = "desc"
):
    """Get paginated list of leads with filters"""
    query = db.query(Lead).options(
        joinedload(Lead.platform),
        joinedload(Lead.plot),
        joinedload(Lead.assigned_user),
        joinedload(Lead.lead_stage),
        joinedload(Lead.lead_status)
    )

    # Apply filters
    if search:
        query = query.filter(
            or_(
                Lead.name.ilike(f"%{search}%"),
                Lead.phone.ilike(f"%{search}%"),
                Lead.email.ilike(f"%{search}%")
            )
        )

    if lead_stage_id:
        query = query.filter(Lead.leadStageId == lead_stage_id)

    if lead_status_id:
        query = query.filter(Lead.leadStatusId == lead_status_id)

    if city:
        query = query.filter(Lead.city == city)

    if platform_id:
        query = query.filter(Lead.platformId == platform_id)

    if interest_status:
        query = query.filter(Lead.interestStatus == interest_status)

    if assigned_to:
        query = query.filter(Lead.assignedTo == assigned_to)

    # Get total count
    total = query.count()

    # Apply sorting
    sort_column = getattr(Lead, sort_by, Lead.createdAt)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    leads = query.offset(offset).limit(page_size).all()

    # Convert to response
    lead_responses = [get_lead_response(lead, db) for lead in leads]

    return LeadListResponse(
        leads=lead_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    """Get a single lead by ID"""
    lead = db.query(Lead).options(
        joinedload(Lead.platform),
        joinedload(Lead.plot),
        joinedload(Lead.assigned_user),
        joinedload(Lead.lead_stage),
        joinedload(Lead.lead_status)
    ).filter(Lead.id == lead_id).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return get_lead_response(lead, db)


@router.post("", response_model=LeadResponse)
def create_lead(lead_data: LeadCreate, db: Session = Depends(get_db)):
    """Create a new lead"""
    # Check if phone already exists
    existing = db.query(Lead).filter(Lead.phone == lead_data.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already exists")

    lead = Lead(**lead_data.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return get_lead_response(lead, db)


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: int, lead_data: LeadUpdate, db: Session = Depends(get_db)):
    """Update a lead"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = lead_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)

    return get_lead_response(lead, db)


@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    """Soft delete a lead (mark as not interested)"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.interestStatus = "not interested"
    db.commit()

    return {"message": "Lead marked as not interested"}


@router.post("/{lead_id}/call")
def initiate_call(lead_id: int, db: Session = Depends(get_db)):
    """Initiate a call to a lead"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Create call log entry
    call_log = CallLog(
        lead_id=lead_id,
        status="initiated"
    )
    db.add(call_log)

    # Increment tracker
    lead.tracker = (lead.tracker or 0) + 1
    db.commit()
    db.refresh(call_log)

    return {
        "message": "Call initiated",
        "call_id": call_log.id,
        "lead_id": lead_id
    }


@router.post("/bulk-action")
def bulk_action(
    action: str,
    lead_ids: List[int],
    value: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Perform bulk actions on leads"""
    if action == "assign":
        if value is None:
            raise HTTPException(status_code=400, detail="User ID required for assignment")
        db.query(Lead).filter(Lead.id.in_(lead_ids)).update(
            {Lead.assignedTo: value},
            synchronize_session=False
        )
    elif action == "mark_not_interested":
        db.query(Lead).filter(Lead.id.in_(lead_ids)).update(
            {Lead.interestStatus: "not interested"},
            synchronize_session=False
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    db.commit()
    return {"message": f"Bulk action '{action}' completed for {len(lead_ids)} leads"}


@router.get("/hot-leads/queue")
def get_hot_leads_queue(
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50)
):
    """Get queue of hot leads requiring follow-up"""
    # Get leads with recent hot classification
    hot_leads = db.query(Lead).options(
        joinedload(Lead.plot),
        joinedload(Lead.assigned_user)
    ).join(CallLog).filter(
        CallLog.classification == "hot"
    ).order_by(CallLog.created_at.desc()).limit(limit).all()

    return [get_lead_response(lead, db) for lead in hot_leads]
