"""
Smartflo API Router — proxies requests to TATA Smartflo API.

Endpoints:
  GET  /smartflo/my-numbers      — Fetch all DID numbers from Smartflo
  GET  /smartflo/users            — Fetch Smartflo users
  POST /smartflo/my-numbers/{number_id}/assign-agent  — Assign an agent to a number (local only)
  PUT  /smartflo/my-numbers/{number_id}/config         — Update local config for a number
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
import requests as http_requests
import json
from datetime import datetime, timedelta

from ..core.database import get_db
from ..core.config import settings
from ..models.user import User
from .auth import get_current_user

router = APIRouter()

# ============================================================================
# Token caching — Smartflo tokens are short-lived, cache and refresh
# ============================================================================
_smartflo_token_cache = {
    "token": None,
    "expires_at": None,
}


def _get_smartflo_token() -> str:
    """Login to Smartflo and get a Bearer token. Caches for 50 minutes."""
    now = datetime.utcnow()

    # Return cached token if still valid
    if (
        _smartflo_token_cache["token"]
        and _smartflo_token_cache["expires_at"]
        and _smartflo_token_cache["expires_at"] > now
    ):
        return _smartflo_token_cache["token"]

    if not settings.SMARTFLO_EMAIL or not settings.SMARTFLO_PASSWORD:
        raise HTTPException(
            status_code=503,
            detail="Smartflo credentials not configured. Set SMARTFLO_EMAIL and SMARTFLO_PASSWORD in .env file.",
        )

    url = f"{settings.SMARTFLO_API_URL}/auth/login"
    payload = {
        "email": settings.SMARTFLO_EMAIL,
        "password": settings.SMARTFLO_PASSWORD,
    }
    headers = {"content-type": "application/json", "accept": "application/json"}

    try:
        r = http_requests.post(url, json=payload, headers=headers, timeout=15)
    except http_requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Smartflo API: {e}")

    if r.status_code != 200:
        raise HTTPException(
            status_code=r.status_code,
            detail=f"Smartflo login failed: {r.text}",
        )

    data = r.json()
    token = data.get("access_token") or data.get("token") or data.get("accessToken")

    if not token:
        raise HTTPException(status_code=502, detail="Smartflo login response missing access token.")

    # Cache for 50 minutes (Smartflo tokens usually last 60 min)
    _smartflo_token_cache["token"] = token
    _smartflo_token_cache["expires_at"] = now + timedelta(minutes=50)

    return token


# ============================================================================
# Pydantic models
# ============================================================================

class SmartfloNumber(BaseModel):
    id: str
    name: str
    description: str
    alias: str
    did: str
    destination: Optional[str] = None
    destination_name: Optional[str] = None
    sms_templates: Optional[str] = None


class SmartfloNumberWithConfig(BaseModel):
    """Extended number with local ARIA configuration."""
    id: str
    name: str
    description: str
    alias: str
    did: str
    destination: Optional[str] = None
    destination_name: Optional[str] = None
    sms_templates: Optional[str] = None
    # Local config (stored in-memory for now; could be DB-backed)
    assigned_agent_id: Optional[int] = None
    assigned_agent_name: Optional[str] = None
    status: str = "active"  # active, inactive, maintenance
    label: str = ""  # user-friendly label
    call_count_today: int = 0
    total_calls: int = 0


class AssignAgentRequest(BaseModel):
    agent_id: int


class UpdateNumberConfigRequest(BaseModel):
    label: Optional[str] = None
    status: Optional[str] = None


class SmartfloUser(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    extension: Optional[str] = None
    status: Optional[int] = None


# ============================================================================
# In-memory config store for number assignments
# (In production, store in database)
# ============================================================================
_number_configs: dict = {}


def _get_number_config(number_id: str) -> dict:
    """Get local config for a number, returning defaults if none exists."""
    return _number_configs.get(number_id, {
        "assigned_agent_id": None,
        "assigned_agent_name": None,
        "status": "active",
        "label": "",
        "call_count_today": 0,
        "total_calls": 0,
    })


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/my-numbers")
def get_my_numbers(
    current_user: User = Depends(get_current_user),
):
    """Fetch phone numbers from Smartflo API with local config overlay."""
    token = _get_smartflo_token()

    url = f"{settings.SMARTFLO_API_URL}/my_number"
    headers = {"accept": "application/json", "Authorization": f"Bearer {token}"}

    try:
        r = http_requests.get(url, headers=headers, timeout=15)
    except http_requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch numbers from Smartflo: {e}")

    if r.status_code != 200:
        raise HTTPException(
            status_code=r.status_code,
            detail=f"Smartflo /my_number failed: {r.text}",
        )

    raw_numbers = r.json()

    # Merge with local config
    numbers = []
    for num in raw_numbers:
        config = _get_number_config(num.get("id", ""))
        numbers.append({
            **num,
            "assigned_agent_id": config.get("assigned_agent_id"),
            "assigned_agent_name": config.get("assigned_agent_name"),
            "status": config.get("status", "active"),
            "label": config.get("label", ""),
            "call_count_today": config.get("call_count_today", 0),
            "total_calls": config.get("total_calls", 0),
        })

    return {
        "numbers": numbers,
        "total": len(numbers),
    }


@router.post("/my-numbers/{number_id}/assign-agent")
def assign_agent_to_number(
    number_id: str,
    data: AssignAgentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign an ARIA agent to a phone number."""
    from ..models.agent import Agent

    agent = db.query(Agent).filter(Agent.id == data.agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    config = _get_number_config(number_id)
    config["assigned_agent_id"] = agent.id
    config["assigned_agent_name"] = agent.name
    _number_configs[number_id] = config

    return {
        "message": f"Agent '{agent.name}' assigned to number {number_id}",
        "number_id": number_id,
        "agent_id": agent.id,
        "agent_name": agent.name,
    }


@router.post("/my-numbers/{number_id}/unassign-agent")
def unassign_agent_from_number(
    number_id: str,
    current_user: User = Depends(get_current_user),
):
    """Remove agent assignment from a phone number."""
    config = _get_number_config(number_id)
    config["assigned_agent_id"] = None
    config["assigned_agent_name"] = None
    _number_configs[number_id] = config

    return {
        "message": f"Agent unassigned from number {number_id}",
        "number_id": number_id,
    }


@router.put("/my-numbers/{number_id}/config")
def update_number_config(
    number_id: str,
    data: UpdateNumberConfigRequest,
    current_user: User = Depends(get_current_user),
):
    """Update local configuration for a phone number (label, status)."""
    config = _get_number_config(number_id)

    if data.label is not None:
        config["label"] = data.label
    if data.status is not None:
        if data.status not in ("active", "inactive", "maintenance"):
            raise HTTPException(status_code=400, detail="Status must be 'active', 'inactive', or 'maintenance'")
        config["status"] = data.status

    _number_configs[number_id] = config

    return {
        "message": f"Number {number_id} config updated",
        "number_id": number_id,
        "config": config,
    }


@router.get("/users")
def get_smartflo_users(
    limit: int = Query(default=20),
    user_status: int = Query(default=1),
    current_user: User = Depends(get_current_user),
):
    """Fetch users from Smartflo API."""
    token = _get_smartflo_token()

    url = f"{settings.SMARTFLO_API_URL}/users"
    headers = {"accept": "application/json", "Authorization": f"Bearer {token}"}
    params = {"limit": limit, "user_status": user_status}

    try:
        r = http_requests.get(url, headers=headers, params=params, timeout=15)
    except http_requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch users from Smartflo: {e}")

    if r.status_code != 200:
        raise HTTPException(
            status_code=r.status_code,
            detail=f"Smartflo /users failed: {r.text}",
        )

    return r.json()
