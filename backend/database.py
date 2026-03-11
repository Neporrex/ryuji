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

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables():
    Base.metadata.create_all(bind=engine)
    _run_migrations()


def _run_migrations():
    is_sqlite = "sqlite" in DATABASE_URL
    if is_sqlite:
        return

    with engine.connect() as conn:
        # Add missing columns
        for col, typ in [
            ("stripe_customer_id",     "VARCHAR(255)"),
            ("stripe_subscription_id", "VARCHAR(255)"),
            ("plan_expires_at",        "TIMESTAMP"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {typ}"))
                conn.commit()
            except Exception:
                conn.rollback()

        # Fix role column: CREATOR -> creator etc.
        try:
            conn.execute(text("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20) USING LOWER(role::text)"))
            conn.commit()
            print("Migration: role column fixed to lowercase")
        except Exception as e:
            conn.rollback()
            print(f"Role migration: {e}")

        # Fix plan column: FREE -> free etc.
        try:
            conn.execute(text("ALTER TABLE users ALTER COLUMN plan TYPE VARCHAR(10) USING LOWER(plan::text)"))
            conn.execute(text("UPDATE users SET plan = 'free' WHERE plan IS NULL OR plan NOT IN ('free','pro')"))
            conn.commit()
            print("Migration: plan column fixed to lowercase")
        except Exception as e:
            conn.rollback()
            print(f"Plan migration: {e}")

        # Drop old enum types
        for t in ["userrole", "userplan"]:
            try:
                conn.execute(text(f"DROP TYPE IF EXISTS {t} CASCADE"))
                conn.commit()
            except Exception:
                conn.rollback()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
