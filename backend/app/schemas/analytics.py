from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class DashboardMetrics(BaseModel):
    live_calls: int = 0
    completed_today: int = 0
    hot_leads_today: int = 0
    answer_rate: float = 0.0
    avg_duration: float = 0.0  # seconds
    qualification_rate: float = 0.0


class CallTrendData(BaseModel):
    date: date
    total_calls: int = 0
    answered: int = 0
    hot_leads: int = 0
    warm_leads: int = 0
    cold_leads: int = 0


class ClassificationBreakdown(BaseModel):
    hot: int = 0
    warm: int = 0
    cold: int = 0
    hot_percentage: float = 0.0
    warm_percentage: float = 0.0
    cold_percentage: float = 0.0


class ObjectionData(BaseModel):
    objection: str
    count: int
    percentage: float


class HeatmapCell(BaseModel):
    hour: int
    day: str
    conversion_rate: float


class AnalyticsResponse(BaseModel):
    metrics: DashboardMetrics
    call_trend: List[CallTrendData]
    classification_breakdown: ClassificationBreakdown
    top_objections: List[ObjectionData]
    best_calling_times: List[HeatmapCell]


class CampaignAnalytics(BaseModel):
    campaign_id: int
    campaign_name: str
    total_calls: int = 0
    answered: int = 0
    hot_leads: int = 0
    warm_leads: int = 0
    cold_leads: int = 0
    avg_duration: float = 0.0
    answer_rate: float = 0.0
    qualification_rate: float = 0.0
    cost_per_hot_lead: float = 0.0


class SalesRepPerformance(BaseModel):
    user_id: int
    user_name: str
    assigned_leads: int = 0
    hot_leads_handled: int = 0
    meetings_scheduled: int = 0
    conversion_rate: float = 0.0
