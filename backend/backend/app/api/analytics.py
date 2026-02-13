from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract
from typing import Optional
from datetime import datetime, date, timedelta
from ..core.database import get_db
from ..models import CallLog, Lead, Campaign
from ..schemas.analytics import (
    DashboardMetrics, CallTrendData, ClassificationBreakdown,
    ObjectionData, HeatmapCell, AnalyticsResponse, CampaignAnalytics
)

router = APIRouter()


@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Get dashboard metrics for today"""
    today = date.today()

    # Live calls (initiated, ringing, or answered without end time)
    live_calls = db.query(func.count(CallLog.id)).filter(
        CallLog.status.in_(["initiated", "ringing", "answered"]),
        CallLog.ended_at.is_(None)
    ).scalar() or 0

    # Completed calls today
    completed_today = db.query(func.count(CallLog.id)).filter(
        func.date(CallLog.created_at) == today,
        CallLog.status == "completed"
    ).scalar() or 0

    # Total calls today
    total_today = db.query(func.count(CallLog.id)).filter(
        func.date(CallLog.created_at) == today
    ).scalar() or 0

    # Answered today
    answered_today = db.query(func.count(CallLog.id)).filter(
        func.date(CallLog.created_at) == today,
        CallLog.status.in_(["answered", "completed"])
    ).scalar() or 0

    # Hot leads today
    hot_leads_today = db.query(func.count(CallLog.id)).filter(
        func.date(CallLog.created_at) == today,
        CallLog.classification == "hot"
    ).scalar() or 0

    # Average duration today
    avg_duration = db.query(func.avg(CallLog.duration)).filter(
        func.date(CallLog.created_at) == today,
        CallLog.duration.isnot(None)
    ).scalar() or 0

    # Answer rate
    answer_rate = (answered_today / total_today * 100) if total_today > 0 else 0

    # Qualification rate (warm + hot / total)
    qualified_today = db.query(func.count(CallLog.id)).filter(
        func.date(CallLog.created_at) == today,
        CallLog.classification.in_(["warm", "hot"])
    ).scalar() or 0
    qualification_rate = (qualified_today / answered_today * 100) if answered_today > 0 else 0

    return DashboardMetrics(
        live_calls=live_calls,
        completed_today=completed_today,
        hot_leads_today=hot_leads_today,
        answer_rate=round(answer_rate, 1),
        avg_duration=float(avg_duration),
        qualification_rate=round(qualification_rate, 1)
    )


@router.get("/call-trend")
def get_call_trend(
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=90)
):
    """Get call trend data for the last N days"""
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    # Get daily stats
    daily_stats = db.query(
        func.date(CallLog.created_at).label('call_date'),
        func.count(CallLog.id).label('total'),
        func.sum(case((CallLog.status.in_(["answered", "completed"]), 1), else_=0)).label('answered'),
        func.sum(case((CallLog.classification == "hot", 1), else_=0)).label('hot'),
        func.sum(case((CallLog.classification == "warm", 1), else_=0)).label('warm'),
        func.sum(case((CallLog.classification == "cold", 1), else_=0)).label('cold')
    ).filter(
        func.date(CallLog.created_at) >= start_date,
        func.date(CallLog.created_at) <= end_date
    ).group_by(
        func.date(CallLog.created_at)
    ).all()

    # Convert to dict for easy lookup
    stats_dict = {
        str(s.call_date): {
            'total': s.total,
            'answered': s.answered or 0,
            'hot': s.hot or 0,
            'warm': s.warm or 0,
            'cold': s.cold or 0
        } for s in daily_stats
    }

    # Fill in missing dates
    result = []
    current = start_date
    while current <= end_date:
        date_str = str(current)
        if date_str in stats_dict:
            result.append(CallTrendData(
                date=current,
                total_calls=stats_dict[date_str]['total'],
                answered=stats_dict[date_str]['answered'],
                hot_leads=stats_dict[date_str]['hot'],
                warm_leads=stats_dict[date_str]['warm'],
                cold_leads=stats_dict[date_str]['cold']
            ))
        else:
            result.append(CallTrendData(
                date=current,
                total_calls=0,
                answered=0,
                hot_leads=0,
                warm_leads=0,
                cold_leads=0
            ))
        current += timedelta(days=1)

    return result


@router.get("/classification-breakdown", response_model=ClassificationBreakdown)
def get_classification_breakdown(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=90),
    campaign_id: Optional[int] = None
):
    """Get classification breakdown for the period"""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    query = db.query(
        func.sum(case((CallLog.classification == "hot", 1), else_=0)).label('hot'),
        func.sum(case((CallLog.classification == "warm", 1), else_=0)).label('warm'),
        func.sum(case((CallLog.classification == "cold", 1), else_=0)).label('cold')
    ).filter(
        func.date(CallLog.created_at) >= start_date,
        CallLog.classification.isnot(None)
    )

    if campaign_id:
        query = query.filter(CallLog.campaign_id == campaign_id)

    result = query.first()

    hot = result.hot or 0
    warm = result.warm or 0
    cold = result.cold or 0
    total = hot + warm + cold

    return ClassificationBreakdown(
        hot=hot,
        warm=warm,
        cold=cold,
        hot_percentage=round(hot / total * 100, 1) if total > 0 else 0,
        warm_percentage=round(warm / total * 100, 1) if total > 0 else 0,
        cold_percentage=round(cold / total * 100, 1) if total > 0 else 0
    )


@router.get("/top-objections")
def get_top_objections(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=90),
    limit: int = Query(5, ge=1, le=10)
):
    """Get top objections raised during calls"""
    # In real implementation, this would analyze call transcripts or stored objection data
    # For now, return mock data
    objections = [
        {"objection": "Price too high", "count": 187, "percentage": 41.0},
        {"objection": "Location concerns", "count": 123, "percentage": 27.0},
        {"objection": "Need more time to decide", "count": 98, "percentage": 21.0},
        {"objection": "Already purchased elsewhere", "count": 52, "percentage": 11.0}
    ]
    return [ObjectionData(**o) for o in objections[:limit]]


@router.get("/best-calling-times")
def get_best_calling_times(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=90)
):
    """Get heatmap data for best calling times"""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    # Query by hour and day of week
    stats = db.query(
        extract('hour', CallLog.started_at).label('hour'),
        extract('dow', CallLog.started_at).label('day_of_week'),
        func.count(CallLog.id).label('total'),
        func.sum(case((CallLog.classification.in_(["warm", "hot"]), 1), else_=0)).label('converted')
    ).filter(
        func.date(CallLog.created_at) >= start_date,
        CallLog.started_at.isnot(None)
    ).group_by(
        extract('hour', CallLog.started_at),
        extract('dow', CallLog.started_at)
    ).all()

    days_map = {0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"}

    result = []
    for s in stats:
        total = s.total or 1
        converted = s.converted or 0
        conversion_rate = round(converted / total * 100, 1)
        result.append(HeatmapCell(
            hour=int(s.hour),
            day=days_map.get(int(s.day_of_week), "Unknown"),
            conversion_rate=conversion_rate
        ))

    return result


@router.get("/campaign/{campaign_id}", response_model=CampaignAnalytics)
def get_campaign_analytics(campaign_id: int, db: Session = Depends(get_db)):
    """Get analytics for a specific campaign"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        return None

    stats = db.query(
        func.count(CallLog.id).label('total'),
        func.sum(case((CallLog.status.in_(["answered", "completed"]), 1), else_=0)).label('answered'),
        func.sum(case((CallLog.classification == "hot", 1), else_=0)).label('hot'),
        func.sum(case((CallLog.classification == "warm", 1), else_=0)).label('warm'),
        func.sum(case((CallLog.classification == "cold", 1), else_=0)).label('cold'),
        func.avg(CallLog.duration).label('avg_duration')
    ).filter(CallLog.campaign_id == campaign_id).first()

    total = stats.total or 0
    answered = stats.answered or 0
    hot = stats.hot or 0

    return CampaignAnalytics(
        campaign_id=campaign_id,
        campaign_name=campaign.name,
        total_calls=total,
        answered=answered,
        hot_leads=hot,
        warm_leads=stats.warm or 0,
        cold_leads=stats.cold or 0,
        avg_duration=float(stats.avg_duration or 0),
        answer_rate=round(answered / total * 100, 1) if total > 0 else 0,
        qualification_rate=round((hot + (stats.warm or 0)) / answered * 100, 1) if answered > 0 else 0,
        cost_per_hot_lead=round(142.0 * total / hot, 2) if hot > 0 else 0  # Placeholder calculation
    )
