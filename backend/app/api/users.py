from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import bcrypt
from ..core.database import get_db
from ..models import User, Lead
from ..schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse

router = APIRouter()


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def get_user_response(user: User, db: Session) -> UserResponse:
    """Convert User model to response"""
    assigned_count = db.query(func.count(Lead.id)).filter(
        Lead.assignedTo == user.id
    ).scalar() or 0

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role,
        is_active=user.is_active,
        is_on_leave=user.is_on_leave,
        created_at=user.created_at,
        updated_at=user.updated_at,
        assigned_leads_count=assigned_count
    )


@router.get("", response_model=UserListResponse)
def get_users(
    db: Session = Depends(get_db),
    role: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """Get list of users"""
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    users = query.order_by(User.full_name).all()

    return UserListResponse(
        users=[get_user_response(u, db) for u in users],
        total=len(users)
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a single user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return get_user_response(user, db)


@router.post("", response_model=UserResponse)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    # Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user_data.password)

    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return get_user_response(user, db)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db)):
    """Update a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_data.model_dump(exclude_unset=True)

    if 'password' in update_data:
        update_data['hashed_password'] = hash_password(update_data.pop('password'))

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return get_user_response(user, db)


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Deactivate a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.commit()

    return {"message": "User deactivated"}


@router.get("/sales-team/available")
def get_available_sales_reps(db: Session = Depends(get_db)):
    """Get available sales reps for lead assignment"""
    reps = db.query(User).filter(
        User.role == "sales_rep",
        User.is_active == True,
        User.is_on_leave == False
    ).all()

    result = []
    for rep in reps:
        lead_count = db.query(func.count(Lead.id)).filter(
            Lead.assignedTo == rep.id
        ).scalar() or 0

        result.append({
            "id": rep.id,
            "full_name": rep.full_name,
            "email": rep.email,
            "assigned_leads": lead_count
        })

    return sorted(result, key=lambda x: x['assigned_leads'])
