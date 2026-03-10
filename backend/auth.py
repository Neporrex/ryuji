"""
Authentication: JWT creation/validation, password hashing, role middleware
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole

# ── Config ────────────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION_USE_LONG_RANDOM_STRING")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

# ── Password ──────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


# ── Dependencies ──────────────────────────────────────────────────────────────

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Return the current authenticated user or None."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    return user


def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Require a valid authenticated user."""
    user = get_current_user(credentials, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    return user


def require_admin(user: User = Depends(require_auth)) -> User:
    """Require admin or creator role."""
    if user.role not in (UserRole.ADMIN, UserRole.CREATOR):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_creator(user: User = Depends(require_auth)) -> User:
    """Require creator role (neporrex only)."""
    if user.role != UserRole.CREATOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Creator access required")
    return user


# ── Rate limit helpers ────────────────────────────────────────────────────────

DAILY_LIMITS = {
    "guest": 10,
    "user": 100,
    "admin": 1000,
    "creator": 99999,
}


def get_daily_limit(role: UserRole) -> int:
    return DAILY_LIMITS.get(role.value, 10)


def check_and_increment_message_count(user: User, db: Session) -> bool:
    """
    Check if user is within daily limit and increment counter.
    Returns True if allowed, False if limit exceeded.
    """
    today = datetime.utcnow().date()
    last_date = user.last_message_date.date() if user.last_message_date else None

    if last_date != today:
        user.daily_message_count = 0
        user.last_message_date = datetime.utcnow()

    limit = get_daily_limit(user.role)
    if user.daily_message_count >= limit:
        return False

    user.daily_message_count += 1
    db.commit()
    return True
