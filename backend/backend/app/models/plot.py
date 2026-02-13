from sqlalchemy import Column, Integer, String, DateTime, DECIMAL, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class Plot(Base):
    __tablename__ = "plots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    plot_number = Column(String(50), nullable=True)
    property_type = Column(String(50), nullable=True)  # Residential, Commercial, Industrial
    area_sqft = Column(Integer, nullable=True)
    price = Column(DECIMAL(12, 2), nullable=True)
    location = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    amenities = Column(Text, nullable=True)
    status = Column(String(50), default="available")  # available, sold, reserved
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    leads = relationship("Lead", back_populates="plot")

    def __repr__(self):
        return f"<Plot(id={self.id}, name={self.name}, plot_number={self.plot_number})>"
