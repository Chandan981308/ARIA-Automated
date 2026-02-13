from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, JSON, ForeignKey, Time, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..core.database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    filters = Column(JSON, nullable=True)  # Lead selection criteria
    daily_call_limit = Column(Integer, default=500)
    calling_hours_start = Column(Time, default="09:00:00")
    calling_hours_end = Column(Time, default="21:00:00")
    max_attempts_per_lead = Column(Integer, default=3)
    retry_interval_hours = Column(Integer, default=4)
    priority = Column(String(20), default="medium")  # high, medium, low
    script_id = Column(Integer, nullable=True)
    total_leads = Column(Integer, default=0)
    completed_leads = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User", back_populates="created_campaigns")
    call_logs = relationship("CallLog", back_populates="campaign")

    __table_args__ = (
        Index("idx_status", "status"),
        Index("idx_created_by", "created_by"),
    )

    def __repr__(self):
        return f"<Campaign(id={self.id}, name={self.name}, status={self.status})>"
