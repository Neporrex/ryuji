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
    create_tables()
    seed_defaults()
    yield


def seed_defaults():
    from database import SessionLocal
    from models import User, UserRole, Setting
    from auth import hash_password

    creator_username = os.getenv("CREATOR_USERNAME", "neporrex")
    creator_email = os.getenv("CREATOR_EMAIL", "neporrex@ryuji.ai")
    creator_password = os.getenv("CREATOR_PASSWORD", "")

    if not creator_password:
        return

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

        defaults = [
            ("ryuji.model", os.getenv("AI_MODEL", "llama-3.3-70b-versatile"), "AI model"),
            ("ryuji.version", "1.0.0", "Version"),
            ("ryuji.tagline", "Sharp mind. Calm presence.", "Tagline"),
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


app = FastAPI(
    title="Ryuji API",
    description="AI assistant backend — created by neporrex",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("SHOW_DOCS", "true") == "true" else None,
    redoc_url=None,
)

# ── CORS — allow all origins (handles any Vercel domain) ──────────────────────
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(admin_router)


@app.get("/", tags=["Root"])
def root():
    return {"name": "Ryuji API", "version": "1.0.0", "status": "operational", "creator": "neporrex"}


@app.get("/health", tags=["Root"])
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)
