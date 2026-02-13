from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class Platform(Base):
    __tablename__ = "platforms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    icon = Column(String(100), nullable=True)  # Icon name or URL
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    leads = relationship("Lead", back_populates="platform")

    def __repr__(self):
        return f"<Platform(id={self.id}, name={self.name})>"
