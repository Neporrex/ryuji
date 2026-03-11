"""
Pydantic schemas
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from models import UserRole, UserPlan


class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 64:
            raise ValueError("Username must be 3–64 characters")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username may only contain letters, numbers, _ and -")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    plan: str = "free"
    is_pro: bool = False


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: UserRole
    plan: UserPlan
    is_pro: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    message_id: str
    remaining_messages: Optional[int] = None


class ConversationResponse(BaseModel):
    id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: UserRole
    plan: UserPlan
    is_active: bool
    is_banned: bool
    daily_message_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class BanUserRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None


class UpdateRoleRequest(BaseModel):
    user_id: str
    role: UserRole


class StatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_conversations: int
    total_messages: int
    banned_users: int
    pro_users: int


class SettingUpdate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
