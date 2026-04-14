from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.phase import Phase


def list_by_user_id(db: Session, user_id: int) -> list[Phase]:
    result = db.scalars(select(Phase).where(Phase.user_id == user_id).order_by(Phase.start_date))
    return list(result)

