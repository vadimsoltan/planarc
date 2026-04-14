from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.goal import Goal


def list_by_user_id(db: Session, user_id: int) -> list[Goal]:
    result = db.scalars(select(Goal).where(Goal.user_id == user_id).order_by(Goal.end_date, Goal.id))
    return list(result)
