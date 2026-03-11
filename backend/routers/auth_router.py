"""
Auth routes: signup, login, me
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole
from schemas import SignupRequest, LoginRequest, TokenResponse, UserResponse
from auth import hash_password, verify_password, create_access_token, require_auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.USER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        role=user.role.value,
        username=user.username,
        plan=user.plan.value,
        is_pro=user.is_pro,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="Account suspended")

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        role=user.role.value,
        username=user.username,
        plan=user.plan.value,
        is_pro=user.is_pro,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(require_auth)):
    return current_user


@router.get("/limits")
def get_limits(current_user: User = Depends(require_auth)):
    from auth import get_daily_limit
    limit = get_daily_limit(current_user)
    remaining = max(0, limit - current_user.daily_message_count)
    return {
        "plan": current_user.plan.value,
        "is_pro": current_user.is_pro,
        "daily_limit": limit if limit < 99999 else None,
        "used_today": current_user.daily_message_count,
        "remaining": remaining if limit < 99999 else None,
    }
