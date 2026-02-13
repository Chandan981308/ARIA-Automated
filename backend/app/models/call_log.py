from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, DECIMAL, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..core.database import Base


class CallStatus(str, enum.Enum):
    INITIATED = "initiated"
    RINGING = "ringing"
    ANSWERED = "answered"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"
    BUSY = "busy"


class Classification(str, enum.Enum):
    COLD = "cold"
    WARM = "warm"
    HOT = "hot"


class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    call_id = Column(String(100), unique=True, nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    status = Column(Enum(CallStatus), nullable=True)
    duration = Column(Integer, nullable=True)  # seconds
    recording_url = Column(String(500), nullable=True)
    transcript_url = Column(String(500), nullable=True)
    transcript_text = Column(String(10000), nullable=True)
    classification = Column(Enum(Classification), nullable=True)
    sentiment_score = Column(DECIMAL(3, 2), nullable=True)  # 0.00 to 1.00
    call_outcome = Column(String(100), nullable=True)
    call_summary = Column(String(2000), nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    lead = relationship("Lead", back_populates="call_logs")
    campaign = relationship("Campaign", back_populates="call_logs")

    __table_args__ = (
        Index("idx_lead_history", "lead_id", "created_at"),
        Index("idx_campaign_stats", "campaign_id", "classification"),
    )

    def __repr__(self):
        return f"<CallLog(id={self.id}, lead_id={self.lead_id}, status={self.status})>"
