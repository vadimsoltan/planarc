from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.repositories.phase_repository import list_by_user_id
from app.schemas.phase import PhaseRead

router = APIRouter(prefix="/phases", tags=["phases"])


@router.get("", response_model=list[PhaseRead])
def get_phases(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[PhaseRead]:
    phases = list_by_user_id(db, current_user.id)
    return [PhaseRead.model_validate(phase) for phase in phases]

