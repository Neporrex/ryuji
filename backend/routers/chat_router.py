"""
Chat routes: /api/chat, /api/conversations
Uses Groq API as Ryuji's AI brain.
"""
import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from groq import Groq

from database import get_db
from models import User, UserRole, Conversation, Message
from schemas import ChatRequest, ChatResponse, ConversationResponse, MessageResponse
from auth import (
    get_current_user, require_auth,
    check_and_increment_message_count, get_daily_limit
)
from system_prompt import build_system_prompt, get_guest_system_prompt

router = APIRouter(prefix="/api", tags=["Chat"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "llama3-70b-8192")
MAX_HISTORY_MESSAGES = int(os.getenv("MAX_HISTORY_MESSAGES", "20"))
GUEST_DAILY_LIMIT = 10

_guest_counts: dict = {}


def get_groq_client() -> Groq:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    return Groq(api_key=GROQ_API_KEY)


def build_message_history(messages: List[Message]) -> List[dict]:
    history = []
    for msg in messages[-MAX_HISTORY_MESSAGES:]:
        history.append({"role": msg.role, "content": msg.content})
    return history


def check_guest_limit(request: Request) -> bool:
    ip = request.client.host if request.client else "unknown"
    count = _guest_counts.get(ip, 0)
    if count >= GUEST_DAILY_LIMIT:
        return False
    _guest_counts[ip] = count + 1
    return True


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    if current_user:
        if not check_and_increment_message_count(current_user, db):
            limit = get_daily_limit(current_user.role)
            raise HTTPException(status_code=429, detail=f"Daily message limit reached ({limit} messages).")
        system_prompt = build_system_prompt(user_role=current_user.role.value, username=current_user.username)
    else:
        if not check_guest_limit(request):
            raise HTTPException(status_code=429, detail=f"Guest limit reached ({GUEST_DAILY_LIMIT} messages/day). Create a free account for more.")
        system_prompt = get_guest_system_prompt()

    conversation_id = payload.conversation_id
    conversation = None

    if current_user and conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        ).first()

    if not conversation and current_user:
        title = payload.message[:60] + ("…" if len(payload.message) > 60 else "")
        conversation = Conversation(user_id=current_user.id, title=title)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        conversation_id = conversation.id
    elif not conversation_id:
        conversation_id = str(uuid.uuid4())

    history = []
    if conversation:
        existing = db.query(Message).filter(Message.conversation_id == conversation.id).order_by(Message.created_at).all()
        history = build_message_history(existing)

    history.append({"role": "user", "content": payload.message})

    if conversation:
        db.add(Message(id=str(uuid.uuid4()), conversation_id=conversation.id, role="user", content=payload.message))
        db.commit()

    client = get_groq_client()
    try:
        response = client.chat.completions.create(
            model=AI_MODEL,
            messages=[{"role": "system", "content": system_prompt}] + history,
            max_tokens=2048,
            temperature=0.7,
        )
        reply_text = response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    assistant_msg_id = str(uuid.uuid4())
    if conversation:
        db.add(Message(id=assistant_msg_id, conversation_id=conversation.id, role="assistant", content=reply_text))
        db.commit()

    return ChatResponse(reply=reply_text, conversation_id=conversation_id, message_id=assistant_msg_id)


@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    convs = db.query(Conversation).filter(
        Conversation.user_id == current_user.id,
        Conversation.is_archived == False
    ).order_by(Conversation.updated_at.desc()).limit(50).all()
    result = []
    for c in convs:
        count = db.query(Message).filter(Message.conversation_id == c.id).count()
        result.append(ConversationResponse(id=c.id, title=c.title, created_at=c.created_at, updated_at=c.updated_at, message_count=count))
    return result


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
def get_messages(conversation_id: str, current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at).all()


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted"}
