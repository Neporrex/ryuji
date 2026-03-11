import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import create_tables
from routers.auth_router import router as auth_router
from routers.chat_router import router as chat_router
from routers.admin_router import router as admin_router
from routers.stripe_router import router as stripe_router

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
        if not db.query(User).filter(User.username == creator_username).first():
            db.add(User(
                username=creator_username,
                email=creator_email,
                password_hash=hash_password(creator_password),
                role=UserRole.CREATOR,
            ))
        defaults = [
            ("ryuji.model", os.getenv("AI_MODEL", "llama-3.3-70b-versatile"), "AI model"),
            ("ryuji.version", "1.0.0", "Version"),
            ("ryuji.pro_price", "9.99", "Pro plan monthly price (USD)"),
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
)

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
app.include_router(stripe_router)


@app.get("/", tags=["Root"])
def root():
    return {"name": "Ryuji API", "version": "1.0.0", "status": "operational"}

@app.get("/health", tags=["Root"])
def health():
    return {"status": "healthy"}
