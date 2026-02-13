from sqlalchemy import Column, Integer, String, DateTime, Enum, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..core.database import Base


class ComplianceEventType(str, enum.Enum):
    CONSENT_CAPTURED = "consent_captured"
    OPT_OUT_REQUESTED = "opt_out_requested"
    DLT_CHECK = "dlt_check"
    TIME_WINDOW_VIOLATION = "time_window_violation"
    DATA_ERASURE_REQUEST = "data_erasure_request"
    DATA_ERASURE_COMPLETED = "data_erasure_completed"


class ComplianceLog(Base):
    __tablename__ = "compliance_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(Enum(ComplianceEventType), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    call_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    lead = relationship("Lead", back_populates="compliance_logs")

    __table_args__ = (
        Index("idx_event_type", "event_type", "created_at"),
        Index("idx_lead_compliance", "lead_id"),
    )

    def __repr__(self):
        return f"<ComplianceLog(id={self.id}, event_type={self.event_type})>"
