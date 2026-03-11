import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from models import Base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ryuji.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=bool(os.getenv("DB_ECHO", False)),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables():
    """Create all tables if they don't exist, then run migrations."""
    Base.metadata.create_all(bind=engine)
    _run_migrations()


def _run_migrations():
    """Add new columns to existing tables if they don't exist."""
    is_sqlite = "sqlite" in DATABASE_URL

    migrations = [
        ("users", "plan",                   "VARCHAR(10) DEFAULT 'free'"),
        ("users", "stripe_customer_id",     "VARCHAR(255)"),
        ("users", "stripe_subscription_id", "VARCHAR(255)"),
        ("users", "plan_expires_at",        "TIMESTAMP"),
    ]

    with engine.connect() as conn:
        for table, column, col_type in migrations:
            try:
                if is_sqlite:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                else:
                    conn.execute(text(
                        f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type}"
                    ))
                conn.commit()
                print(f"Migration: added {table}.{column}")
            except Exception:
                conn.rollback()
                pass  # Column already exists


def get_db():
    """Dependency for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
