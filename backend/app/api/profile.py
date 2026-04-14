from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.repositories.profile_repository import get_by_user_id, save
from app.schemas.profile import ProfileRead, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileRead)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ProfileRead:
    profile = get_by_user_id(db, current_user.id)
    return ProfileRead.model_validate(profile)


@router.put("", response_model=ProfileRead)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileRead:
    profile = get_by_user_id(db, current_user.id)
    profile.height_cm = payload.height_cm
    profile.age = payload.age
    profile.sex = payload.sex.value
    profile.start_weight_kg = payload.start_weight_kg
    profile.current_goal_weight_kg = payload.current_goal_weight_kg
    profile.adjusted_body_fat_current = payload.adjusted_body_fat_current
    profile.default_training_days_per_week = payload.default_training_days_per_week
    profile.default_step_target = payload.default_step_target
    save(db, profile)
    db.commit()
    db.refresh(profile)
    return ProfileRead.model_validate(profile)

