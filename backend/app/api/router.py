from __future__ import annotations

from fastapi import APIRouter

from app.api import analytics, auth, daily_logs, goals, health, measurements, phases, profile, workouts

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(phases.router)
api_router.include_router(goals.router)
api_router.include_router(daily_logs.router)
api_router.include_router(measurements.router)
api_router.include_router(workouts.router)
api_router.include_router(analytics.router)
