from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.analytics import DashboardAnalyticsResponse, ProjectionsResponse, StrengthAnalyticsResponse
from app.services.analytics_service import build_dashboard_analytics, build_projections, build_strength_analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardAnalyticsResponse:
    return build_dashboard_analytics(db, current_user.id)


@router.get("/strength", response_model=StrengthAnalyticsResponse)
def get_strength_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StrengthAnalyticsResponse:
    return build_strength_analytics(db, current_user.id)


@router.get("/projections", response_model=ProjectionsResponse)
def get_projections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectionsResponse:
    return build_projections(db, current_user.id)
