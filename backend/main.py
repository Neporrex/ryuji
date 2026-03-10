"""
Ryuji — FastAPI Backend
Created and configured by neporrex
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import create_tables
from routers.auth_router import router as auth_router
from routers.chat_router import router as chat_router
from routers.admin_router import router as admin_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables, seed defaults."""
    create_tables()
    seed_defaults()
    yield
    # Cleanup (if needed)


def seed_defaults():
    """Seed the creator account and default settings if they don't exist."""
    from database import SessionLocal
    from models import User, UserRole, Setting
    from auth import hash_password

    creator_username = os.getenv("CREATOR_USERNAME", "neporrex")
    creator_email = os.getenv("CREATOR_EMAIL", "neporrex@ryuji.ai")
    creator_password = os.getenv("CREATOR_PASSWORD", "")

    if not creator_password:
        return  # Don't auto-create without a password

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == creator_username).first()
        if not existing:
            creator = User(
                username=creator_username,
                email=creator_email,
                password_hash=hash_password(creator_password),
                role=UserRole.CREATOR,
            )
            db.add(creator)

        # Default settings
        defaults = [
            ("ryuji.model", os.getenv("AI_MODEL", "claude-sonnet-4-20250514"), "AI model identifier"),
            ("ryuji.version", "1.0.0", "Current Ryuji version"),
            ("ryuji.tagline", "Sharp mind. Calm presence.", "Ryuji tagline"),
        ]
        for key, value, desc in defaults:
            if not db.query(Setting).filter(Setting.key == key).first():
                db.add(Setting(key=key, value=value, description=desc))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Seed warning: {e}")
    finally:
        db.close()


# ── Application ───────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://ryuji.vercel.app"
).split(",")

app = FastAPI(
    title="Ryuji API",
    description="AI assistant backend — created by neporrex",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("SHOW_DOCS", "true") == "true" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(admin_router)


@app.get("/", tags=["Root"])
def root():
    return {
        "name": "Ryuji API",
        "version": "1.0.0",
        "status": "operational",
        "creator": "neporrex",
        "tagline": "Sharp mind. Calm presence.",
    }


@app.get("/health", tags=["Root"])
def health():
    return {"status": "healthy"}


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("DEV_MODE", "false") == "true",
        workers=int(os.getenv("WORKERS", "1")),
    )
