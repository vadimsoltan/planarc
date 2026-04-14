# WTA Fitness Tracker

Milestone 1 foundation for the fitness tracking app defined in [fitness_tracking_app_technical_spec.md](/Users/vadim/Documents/wta/fitness_tracking_app_technical_spec.md).

## Stack

- Backend: FastAPI, SQLAlchemy, Alembic, SQLite, bcrypt cookie-session auth
- Frontend: React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod, Tailwind
- Runtime: single-container Docker Compose for production, direct local commands for development

## Production Quick Start

1. Copy `.env.example` to `.env` and adjust credentials if desired.
2. Run `docker compose up --build`.
3. Open [http://localhost:8000](http://localhost:8000).
4. Sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

This production path builds the frontend, serves it from FastAPI, and exposes the app on a single origin. That keeps session
cookies simple and is the intended deploy shape for a small single-VPS host.

## Runtime Endpoints

- App: `http://localhost:8000`
- API: `http://localhost:8000/api`
- Health check: `http://localhost:8000/api/health`

## Local Commands

### Backend

- Install: `pip install -e "backend[dev]"`
- Run: `cd backend && sh dev.sh`
- Test: `cd backend && pytest`

### Frontend

- Install: `cd frontend && npm install`
- Run: `cd frontend && npm run dev`
- Test: `cd frontend && npm run test -- --run`

When running the frontend dev server locally, it proxies `/api` requests to the backend so the auth flow still behaves like the
production single-origin setup.
