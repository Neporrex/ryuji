"""
Admin routes: dashboard stats, user management, settings
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole, Conversation, Message, Setting
from schemas import (
    AdminUserResponse, BanUserRequest, UpdateRoleRequest,
    StatsResponse, SettingUpdate
)
from auth import require_admin, require_creator

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Aggregated platform statistics."""
    return StatsResponse(
        total_users=db.query(User).count(),
        active_users=db.query(User).filter(User.is_active == True, User.is_banned == False).count(),
        total_conversations=db.query(Conversation).count(),
        total_messages=db.query(Message).count(),
        banned_users=db.query(User).filter(User.is_banned == True).count(),
    )


# ── User management ───────────────────────────────────────────────────────────

@router.get("/users", response_model=List[AdminUserResponse])
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List all users (admin view)."""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.post("/users/ban")
def ban_user(
    payload: BanUserRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Ban a user account."""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.CREATOR:
        raise HTTPException(status_code=403, detail="Cannot ban the creator")
    if user.role == UserRole.ADMIN and admin.role != UserRole.CREATOR:
        raise HTTPException(status_code=403, detail="Only the creator can ban admins")

    user.is_banned = True
    db.commit()
    return {"message": f"User {user.username} has been banned"}


@router.post("/users/unban")
def unban_user(
    payload: BanUserRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Unban a user account."""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = False
    db.commit()
    return {"message": f"User {user.username} has been unbanned"}


@router.post("/users/role")
def update_role(
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Update a user's role (creator only for admin+ roles)."""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only creator can grant admin/creator roles
    if payload.role in (UserRole.ADMIN, UserRole.CREATOR) and admin.role != UserRole.CREATOR:
        raise HTTPException(status_code=403, detail="Only the creator can grant elevated roles")

    user.role = payload.role
    db.commit()
    return {"message": f"User {user.username} role updated to {payload.role.value}"}


# ── Settings (creator only) ───────────────────────────────────────────────────

@router.get("/settings")
def get_settings(
    db: Session = Depends(get_db),
    _creator: User = Depends(require_creator),
):
    """Get all platform settings (creator only)."""
    settings = db.query(Setting).all()
    return [{"key": s.key, "value": s.value, "description": s.description} for s in settings]


@router.put("/settings")
def update_setting(
    payload: SettingUpdate,
    db: Session = Depends(get_db),
    creator: User = Depends(require_creator),
):
    """Update or create a platform setting (creator only)."""
    setting = db.query(Setting).filter(Setting.key == payload.key).first()
    if setting:
        setting.value = payload.value
        if payload.description:
            setting.description = payload.description
        setting.updated_by = creator.id
    else:
        setting = Setting(
            key=payload.key,
            value=payload.value,
            description=payload.description,
            updated_by=creator.id,
        )
        db.add(setting)
    db.commit()
    return {"message": "Setting updated", "key": payload.key}
