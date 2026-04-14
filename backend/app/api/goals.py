from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.goal import GoalStatusRead
from app.services.goal_service import build_goal_statuses

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[GoalStatusRead])
def get_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[GoalStatusRead]:
    return build_goal_statuses(db, current_user.id)
