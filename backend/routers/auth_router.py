"""
Authentication routes: /auth/signup, /auth/login, /auth/me
"""
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole
from schemas import SignupRequest, LoginRequest, TokenResponse, UserResponse
from auth import (
    hash_password, verify_password, create_access_token,
    require_auth, get_daily_limit
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

CREATOR_USERNAME = os.getenv("CREATOR_USERNAME", "neporrex")
CREATOR_EMAIL = os.getenv("CREATOR_EMAIL", "")


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    # Check uniqueness
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Determine role
    role = UserRole.USER
    if payload.username.lower() == CREATOR_USERNAME.lower():
        role = UserRole.CREATOR
    elif CREATOR_EMAIL and payload.email.lower() == CREATOR_EMAIL.lower():
        role = UserRole.CREATOR

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role.value})
    return TokenResponse(access_token=token, role=user.role.value, username=user.username)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate and receive a JWT token."""
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="Account suspended")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")

    token = create_access_token({"sub": user.id, "role": user.role.value})
    return TokenResponse(access_token=token, role=user.role.value, username=user.username)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(require_auth)):
    """Return the current authenticated user."""
    return current_user


@router.get("/limits")
def get_limits(current_user: User = Depends(require_auth)):
    """Return the user's daily message limits."""
    return {
        "role": current_user.role.value,
        "daily_limit": get_daily_limit(current_user.role),
        "used_today": current_user.daily_message_count,
        "remaining": max(0, get_daily_limit(current_user.role) - current_user.daily_message_count),
    }
