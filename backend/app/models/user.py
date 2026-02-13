from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    SALES_REP = "sales_rep"
    COMPLIANCE = "compliance"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.SALES_REP)
    is_active = Column(Boolean, default=True)
    is_on_leave = Column(Boolean, default=False)
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    assigned_leads = relationship("Lead", back_populates="assigned_user")
    created_campaigns = relationship("Campaign", back_populates="creator")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
