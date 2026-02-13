from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, JSON, ForeignKey, Index, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..core.database import Base


class InterestStatus(str, enum.Enum):
    INTERESTED = "interested"
    NOT_INTERESTED = "not interested"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=True)
    email = Column(String(255), unique=True, nullable=True)
    phone = Column(String(20), unique=True, nullable=True)
    platformId = Column(Integer, ForeignKey("platforms.id"), nullable=True)
    assignedTo = Column(Integer, ForeignKey("users.id"), nullable=True)
    plotId = Column(Integer, ForeignKey("plots.id"), nullable=True)
    leadStatusId = Column(Integer, ForeignKey("lead_statuses.id"), nullable=True)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    leadStageId = Column(Integer, ForeignKey("lead_stages.id"), nullable=True)
    tracker = Column(Integer, default=0)
    interestStatus = Column(
        Enum(InterestStatus),
        nullable=True
    )
    other = Column(JSON, nullable=True, default={})

    # Relationships
    platform = relationship("Platform", back_populates="leads")
    assigned_user = relationship("User", back_populates="assigned_leads")
    plot = relationship("Plot", back_populates="leads")
    lead_status = relationship("LeadStatus", back_populates="leads")
    lead_stage = relationship("LeadStage", back_populates="leads")
    call_logs = relationship("CallLog", back_populates="lead")
    compliance_logs = relationship("ComplianceLog", back_populates="lead")

    __table_args__ = (
        Index("idx_campaign_query", "leadStageId", "city", "interestStatus", "tracker"),
        Index("idx_assignment", "assignedTo", "leadStatusId"),
        Index("idx_platform", "platformId", "createdAt"),
    )

    def __repr__(self):
        return f"<Lead(id={self.id}, name={self.name}, phone={self.phone})>"
