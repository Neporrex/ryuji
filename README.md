# ⚔️ Ryuji — AI Assistant

> **Sharp mind. Calm presence.**
>
> Created and configured by **neporrex**

---

## What is Ryuji?

Ryuji is a full-stack AI assistant with a distinct personality — calm, precise, and technically sharp. It's built around a black-and-gold glassmorphic UI with a constellation background, a FastAPI backend, and the Anthropic Claude API powering its responses.

---

## Project Structure

```
ryuji/
├── frontend/     # Next.js 14 app → deploy to Vercel
└── backend/      # FastAPI app → run 24/7 on Render/Railway/VPS
```

---

## Quick Start

### 1. Backend (FastAPI)

```bash
cd backend

# Copy and configure environment
cp .env.example .env
# → Edit .env: set ANTHROPIC_API_KEY, SECRET_KEY, CREATOR_PASSWORD

# Option A: Docker (recommended for 24/7)
docker-compose up -d

# Option B: Local dev
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`
Swagger docs: `http://localhost:8000/docs`

---

### 2. Frontend (Next.js → Vercel)

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# → Set NEXT_PUBLIC_API_URL=http://localhost:8000 (or your deployed backend URL)

# Dev server
npm run dev
```

---

## Deploy to Production

### Backend — Render.com (free tier available)

1. Push `backend/` to a GitHub repo (or subfolder)
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env.example`

### Backend — Railway.app

```bash
cd backend
railway init
railway up
```

### Frontend — Vercel

1. Push the whole repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Set **Root Directory** to `frontend`
4. Add environment variable: `NEXT_PUBLIC_API_URL` = your backend URL
5. Deploy ✓

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key |
| `SECRET_KEY` | ✅ | JWT signing secret (use `openssl rand -hex 32`) |
| `CREATOR_USERNAME` | ✅ | Username for creator account (default: `neporrex`) |
| `CREATOR_EMAIL` | ✅ | Creator email |
| `CREATOR_PASSWORD` | ✅ | Creator account password (auto-created on start) |
| `DATABASE_URL` | — | SQLite by default, PostgreSQL for prod |
| `ALLOWED_ORIGINS` | — | Comma-separated CORS origins |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL |

---

## Role System

| Role | Description | Daily Messages |
|---|---|---|
| `guest` | Not logged in | 10/day |
| `user` | Registered account | 100/day |
| `admin` | Platform admin | 1,000/day |
| `creator` | neporrex — full access | Unlimited |

---

## Creator Access

The creator account is automatically provisioned on backend startup if `CREATOR_PASSWORD` is set.

- Username must match `CREATOR_USERNAME` (default: `neporrex`)
- Gets elevated system prompt with full technical depth
- Can manage platform settings, roles, and user bans
- Ryuji addresses the creator with special recognition

---

## API Reference

### Auth
- `POST /auth/signup` — Register new user
- `POST /auth/login` — Get JWT token
- `GET /auth/me` — Get current user

### Chat
- `POST /api/chat` — Send message to Ryuji
- `GET /api/conversations` — List conversations
- `GET /api/conversations/{id}/messages` — Get messages
- `DELETE /api/conversations/{id}` — Delete conversation

### Admin (admin/creator only)
- `GET /admin/stats` — Platform statistics
- `GET /admin/users` — List all users
- `POST /admin/users/ban` — Ban a user
- `POST /admin/users/unban` — Unban a user
- `POST /admin/users/role` — Change user role
- `GET /admin/settings` — Get settings (creator only)
- `PUT /admin/settings` — Update settings (creator only)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12, SQLAlchemy |
| Database | SQLite (dev) / PostgreSQL (prod) |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| Auth | JWT (python-jose), bcrypt |
| Deploy | Vercel (frontend) + Render/Docker (backend) |

---

*Ryuji — Created by neporrex*
