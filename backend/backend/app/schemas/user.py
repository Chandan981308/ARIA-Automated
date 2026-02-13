from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRoleEnum(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    SALES_REP = "sales_rep"
    COMPLIANCE = "compliance"


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRoleEnum = UserRoleEnum.SALES_REP


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRoleEnum] = None
    is_active: Optional[bool] = None
    is_on_leave: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_on_leave: bool
    created_at: datetime
    updated_at: datetime
    assigned_leads_count: int = 0

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
