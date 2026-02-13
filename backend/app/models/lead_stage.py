from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class LeadStage(Base):
    __tablename__ = "lead_stages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    order_index = Column(Integer, default=0)
    color = Column(String(20), default="#6B7280")  # Hex color for UI
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    leads = relationship("Lead", back_populates="lead_stage")

    def __repr__(self):
        return f"<LeadStage(id={self.id}, name={self.name})>"
