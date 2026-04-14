from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.daily_log import DailyLog
from app.models.user import User
from app.repositories import daily_log_repository
from app.schemas.daily_log import DailyLogCreate, DailyLogRead, DailyLogUpdate

router = APIRouter(prefix="/daily-logs", tags=["daily-logs"])


@router.get("", response_model=list[DailyLogRead])
def list_daily_logs(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DailyLogRead]:
    logs = daily_log_repository.list_by_user_id(db, current_user.id, start_date=start_date, end_date=end_date)
    return [DailyLogRead.model_validate(log) for log in logs]


@router.post("", response_model=DailyLogRead, status_code=status.HTTP_201_CREATED)
def create_daily_log(
    payload: DailyLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyLogRead:
    existing = daily_log_repository.get_by_date_for_user(db, current_user.id, payload.date)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A daily log already exists for that date")

    daily_log = DailyLog(user_id=current_user.id)
    _apply_daily_log_payload(daily_log, payload)
    daily_log_repository.save(db, daily_log)
    db.commit()
    db.refresh(daily_log)
    return DailyLogRead.model_validate(daily_log)


@router.put("/{daily_log_id}", response_model=DailyLogRead)
def update_daily_log(
    daily_log_id: int,
    payload: DailyLogUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyLogRead:
    daily_log = daily_log_repository.get_by_id_for_user(db, current_user.id, daily_log_id)
    if daily_log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily log not found")

    existing = daily_log_repository.get_by_date_for_user(db, current_user.id, payload.date)
    if existing is not None and existing.id != daily_log_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A daily log already exists for that date")

    _apply_daily_log_payload(daily_log, payload)
    daily_log_repository.save(db, daily_log)
    db.commit()
    db.refresh(daily_log)
    return DailyLogRead.model_validate(daily_log)


@router.delete("/{daily_log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_daily_log(
    daily_log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    daily_log = daily_log_repository.get_by_id_for_user(db, current_user.id, daily_log_id)
    if daily_log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily log not found")

    daily_log_repository.delete(db, daily_log)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _apply_daily_log_payload(daily_log: DailyLog, payload: DailyLogCreate | DailyLogUpdate) -> None:
    daily_log.date = payload.date
    daily_log.weight_kg = payload.weight_kg
    daily_log.calories = payload.calories
    daily_log.protein_g = payload.protein_g
    daily_log.carbs_g = payload.carbs_g
    daily_log.fat_g = payload.fat_g
    daily_log.steps = payload.steps
    daily_log.cardio_minutes = payload.cardio_minutes
    daily_log.cardio_type = payload.cardio_type
    daily_log.sleep_hours = payload.sleep_hours
    daily_log.is_training_day = payload.is_training_day
    daily_log.notes = payload.notes

