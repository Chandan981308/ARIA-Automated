from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from typing import Optional, List
from datetime import datetime, date, timedelta
from ..core.database import get_db
from ..models import Campaign, Lead, CallLog, User
from ..models.campaign import CampaignStatus
from ..schemas.campaign import (
    CampaignCreate, CampaignUpdate, CampaignResponse,
    CampaignListResponse, CampaignStats
)

router = APIRouter()


def calculate_campaign_stats(campaign: Campaign, db: Session) -> CampaignStats:
    """Calculate campaign statistics"""
    today = date.today()

    # Get call stats for today
    calls_today = db.query(func.count(CallLog.id)).filter(
        CallLog.campaign_id == campaign.id,
        func.date(CallLog.created_at) == today
    ).scalar() or 0

    answered_today = db.query(func.count(CallLog.id)).filter(
        CallLog.campaign_id == campaign.id,
        func.date(CallLog.created_at) == today,
        CallLog.status == "answered"
    ).scalar() or 0

    # Get classification stats
    hot_leads = db.query(func.count(CallLog.id)).filter(
        CallLog.campaign_id == campaign.id,
        CallLog.classification == "hot"
    ).scalar() or 0

    warm_leads = db.query(func.count(CallLog.id)).filter(
        CallLog.campaign_id == campaign.id,
        CallLog.classification == "warm"
    ).scalar() or 0

    cold_leads = db.query(func.count(CallLog.id)).filter(
        CallLog.campaign_id == campaign.id,
        CallLog.classification == "cold"
    ).scalar() or 0

    # Average duration
    avg_duration = db.query(func.avg(CallLog.duration)).filter(
        CallLog.campaign_id == campaign.id,
        CallLog.duration.isnot(None)
    ).scalar() or 0

    # Answer rate
    total_calls = calls_today
    answer_rate = (answered_today / total_calls * 100) if total_calls > 0 else 0

    return CampaignStats(
        total_leads=campaign.total_leads or 0,
        completed_leads=campaign.completed_leads or 0,
        calls_today=calls_today,
        answered_today=answered_today,
        hot_leads=hot_leads,
        warm_leads=warm_leads,
        cold_leads=cold_leads,
        avg_duration=float(avg_duration),
        answer_rate=answer_rate
    )


def get_campaign_response(campaign: Campaign, db: Session) -> CampaignResponse:
    """Convert Campaign model to response"""
    stats = calculate_campaign_stats(campaign, db)

    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        status=campaign.status,
        filters=campaign.filters,
        daily_call_limit=campaign.daily_call_limit,
        calling_hours_start=str(campaign.calling_hours_start) if campaign.calling_hours_start else "09:00",
        calling_hours_end=str(campaign.calling_hours_end) if campaign.calling_hours_end else "21:00",
        max_attempts_per_lead=campaign.max_attempts_per_lead,
        retry_interval_hours=campaign.retry_interval_hours,
        priority=campaign.priority or "medium",
        total_leads=campaign.total_leads or 0,
        completed_leads=campaign.completed_leads or 0,
        created_by=campaign.created_by,
        creator_name=campaign.creator.full_name if campaign.creator else None,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        stats=stats
    )


@router.get("", response_model=CampaignListResponse)
def get_campaigns(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """Get paginated list of campaigns"""
    query = db.query(Campaign).options(joinedload(Campaign.creator))

    if status:
        query = query.filter(Campaign.status == status)

    if search:
        query = query.filter(Campaign.name.ilike(f"%{search}%"))

    total = query.count()

    # Apply pagination
    offset = (page - 1) * page_size
    campaigns = query.order_by(Campaign.created_at.desc()).offset(offset).limit(page_size).all()

    return CampaignListResponse(
        campaigns=[get_campaign_response(c, db) for c in campaigns],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    """Get a single campaign"""
    campaign = db.query(Campaign).options(
        joinedload(Campaign.creator)
    ).filter(Campaign.id == campaign_id).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return get_campaign_response(campaign, db)


@router.post("", response_model=CampaignResponse)
def create_campaign(
    campaign_data: CampaignCreate,
    db: Session = Depends(get_db)
):
    """Create a new campaign"""
    campaign = Campaign(
        name=campaign_data.name,
        filters=campaign_data.filters.model_dump() if campaign_data.filters else None,
        daily_call_limit=campaign_data.daily_call_limit,
        calling_hours_start=campaign_data.calling_hours_start,
        calling_hours_end=campaign_data.calling_hours_end,
        max_attempts_per_lead=campaign_data.max_attempts_per_lead,
        retry_interval_hours=campaign_data.retry_interval_hours,
        priority=campaign_data.priority,
        status=CampaignStatus.DRAFT
    )

    # Calculate total leads based on filters
    if campaign_data.filters:
        lead_count = count_leads_for_filters(campaign_data.filters, db)
        campaign.total_leads = lead_count

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return get_campaign_response(campaign, db)


@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: int,
    campaign_data: CampaignUpdate,
    db: Session = Depends(get_db)
):
    """Update a campaign"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    update_data = campaign_data.model_dump(exclude_unset=True)

    if 'filters' in update_data and update_data['filters']:
        update_data['filters'] = update_data['filters'].model_dump() if hasattr(update_data['filters'], 'model_dump') else update_data['filters']

    for field, value in update_data.items():
        setattr(campaign, field, value)

    db.commit()
    db.refresh(campaign)

    return get_campaign_response(campaign, db)


@router.post("/{campaign_id}/start")
def start_campaign(campaign_id: int, db: Session = Depends(get_db)):
    """Start a campaign"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status == CampaignStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Campaign is already active")

    campaign.status = CampaignStatus.ACTIVE
    db.commit()

    return {"message": "Campaign started", "status": "active"}


@router.post("/{campaign_id}/pause")
def pause_campaign(campaign_id: int, db: Session = Depends(get_db)):
    """Pause a campaign"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = CampaignStatus.PAUSED
    db.commit()

    return {"message": "Campaign paused", "status": "paused"}


@router.get("/{campaign_id}/preview-leads")
def preview_leads(
    campaign_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100)
):
    """Preview leads that match campaign filters"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if not campaign.filters:
        return {"leads": [], "total": 0}

    query = build_lead_query_from_filters(campaign.filters, db)
    total = query.count()
    leads = query.limit(limit).all()

    return {
        "leads": [
            {
                "id": l.id,
                "name": l.name,
                "phone": l.phone,
                "city": l.city,
                "tracker": l.tracker
            } for l in leads
        ],
        "total": total
    }


def count_leads_for_filters(filters, db: Session) -> int:
    """Count leads matching campaign filters"""
    query = build_lead_query_from_filters(filters.model_dump() if hasattr(filters, 'model_dump') else filters, db)
    return query.count()


def build_lead_query_from_filters(filters: dict, db: Session):
    """Build SQLAlchemy query from campaign filters"""
    query = db.query(Lead)

    if not filters:
        return query

    if filters.get('leadStageIds'):
        query = query.filter(Lead.leadStageId.in_(filters['leadStageIds']))

    if filters.get('cities'):
        query = query.filter(Lead.city.in_(filters['cities']))

    if filters.get('states'):
        query = query.filter(Lead.state.in_(filters['states']))

    if filters.get('platformIds'):
        query = query.filter(Lead.platformId.in_(filters['platformIds']))

    if filters.get('plotIds'):
        query = query.filter(Lead.plotId.in_(filters['plotIds']))

    if filters.get('interestStatus'):
        query = query.filter(Lead.interestStatus == filters['interestStatus'])
    else:
        # By default, exclude not interested
        query = query.filter(
            (Lead.interestStatus != 'not interested') |
            (Lead.interestStatus.is_(None))
        )

    if filters.get('maxTracker'):
        query = query.filter(Lead.tracker < filters['maxTracker'])

    return query
