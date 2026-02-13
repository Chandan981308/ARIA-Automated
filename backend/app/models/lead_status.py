from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class LeadStatus(Base):
    __tablename__ = "lead_statuses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    color = Column(String(20), default="#6B7280")  # Hex color for UI
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    leads = relationship("Lead", back_populates="lead_status")

    def __repr__(self):
        return f"<LeadStatus(id={self.id}, name={self.name})>"
