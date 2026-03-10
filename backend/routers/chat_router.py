"""
Chat routes: /api/chat, /api/conversations
Integrates with Anthropic Claude as Ryuji's AI brain.
"""
import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import anthropic

from database import get_db
from models import User, UserRole, Conversation, Message
from schemas import ChatRequest, ChatResponse, ConversationResponse, MessageResponse
from auth import (
    get_current_user, require_auth,
    check_and_increment_message_count, get_daily_limit
)
from system_prompt import build_system_prompt, get_guest_system_prompt

router = APIRouter(prefix="/api", tags=["Chat"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "claude-sonnet-4-20250514")
MAX_HISTORY_MESSAGES = int(os.getenv("MAX_HISTORY_MESSAGES", "20"))
GUEST_DAILY_LIMIT = 10


def get_anthropic_client() -> anthropic.Anthropic:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def build_message_history(messages: List[Message]) -> List[dict]:
    """Convert DB messages to Anthropic API format."""
    history = []
    for msg in messages[-MAX_HISTORY_MESSAGES:]:
        history.append({"role": msg.role, "content": msg.content})
    return history


# ── Guest rate tracking (in-memory, resets on restart) ──────────────────────
_guest_counts: dict = {}  # ip → count


def check_guest_limit(request: Request) -> bool:
    ip = request.client.host if request.client else "unknown"
    count = _guest_counts.get(ip, 0)
    if count >= GUEST_DAILY_LIMIT:
        return False
    _guest_counts[ip] = count + 1
    return True


# ── Main chat endpoint ────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Send a message to Ryuji and receive a response."""

    # Rate limiting
    if current_user:
        if not check_and_increment_message_count(current_user, db):
            limit = get_daily_limit(current_user.role)
            raise HTTPException(
                status_code=429,
                detail=f"Daily message limit reached ({limit} messages). Upgrade or try again tomorrow."
            )
        system_prompt = build_system_prompt(
            user_role=current_user.role.value,
            username=current_user.username,
        )
    else:
        # Guest flow
        if not check_guest_limit(request):
            raise HTTPException(
                status_code=429,
                detail=f"Guest limit reached ({GUEST_DAILY_LIMIT} messages/day). Create a free account for more."
            )
        system_prompt = get_guest_system_prompt()

    # Conversation management
    conversation_id = payload.conversation_id
    conversation = None

    if current_user and conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        ).first()

    if not conversation and current_user:
        # Auto-create conversation with first message as title
        title = payload.message[:60] + ("…" if len(payload.message) > 60 else "")
        conversation = Conversation(
            user_id=current_user.id,
            title=title,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        conversation_id = conversation.id
    elif not conversation_id:
        conversation_id = str(uuid.uuid4())

    # Build message history
    history = []
    if conversation:
        existing = db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at).all()
        history = build_message_history(existing)

    # Add current message
    history.append({"role": "user", "content": payload.message})

    # Save user message to DB
    user_msg_id = str(uuid.uuid4())
    if conversation:
        user_msg = Message(
            id=user_msg_id,
            conversation_id=conversation.id,
            role="user",
            content=payload.message,
        )
        db.add(user_msg)
        db.commit()

    # Call Anthropic API
    client = get_anthropic_client()
    try:
        response = client.messages.create(
            model=AI_MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=history,
        )
        reply_text = response.content[0].text
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Save assistant message to DB
    assistant_msg_id = str(uuid.uuid4())
    if conversation:
        assistant_msg = Message(
            id=assistant_msg_id,
            conversation_id=conversation.id,
            role="assistant",
            content=reply_text,
        )
        db.add(assistant_msg)
        db.commit()

    return ChatResponse(
        reply=reply_text,
        conversation_id=conversation_id,
        message_id=assistant_msg_id,
    )


# ── Conversation endpoints ────────────────────────────────────────────────────

@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """List all conversations for the authenticated user."""
    convs = db.query(Conversation).filter(
        Conversation.user_id == current_user.id,
        Conversation.is_archived == False,
    ).order_by(Conversation.updated_at.desc()).limit(50).all()

    result = []
    for c in convs:
        count = db.query(Message).filter(Message.conversation_id == c.id).count()
        result.append(ConversationResponse(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=count,
        ))
    return result


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
def get_messages(
    conversation_id: str,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Get all messages in a conversation."""
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()
    return messages


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Delete a conversation."""
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted"}
