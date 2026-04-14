# Planarc

Planarc is a private body recomposition tracker for logging daily metrics, measurements, workouts, phases, and goal projections.

## Stack

- Backend: FastAPI, SQLAlchemy, Alembic, SQLite, cookie-session auth
- Frontend: React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod, Tailwind
- Runtime: single-container Docker Compose for production, direct local commands for development

## Quick Start

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. Open [http://localhost:8000](http://localhost:8000).
4. Sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

The production setup builds the frontend, serves it from FastAPI, and keeps the app on a single origin so session cookies stay simple.

## Local Development

### Backend

- Install: `pip install -e "backend[dev]"`
- Run: `cd backend && sh dev.sh`
- Test: `cd backend && pytest`

### Frontend

- Install: `cd frontend && npm install`
- Run: `cd frontend && npm run dev`
- Test: `cd frontend && npm run test -- --run`

The frontend dev server proxies `/api` to the backend, so local auth behaves like production.

## Endpoints

- App: `http://localhost:8000`
- API: `http://localhost:8000/api`
- Health: `http://localhost:8000/api/health`

## Docs

- [Planarc technical specification](docs/fitness_tracking_app_technical_spec.md)
