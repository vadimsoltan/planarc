from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.profile import Profile


def get_by_user_id(db: Session, user_id: int) -> Profile | None:
    return db.scalar(select(Profile).where(Profile.user_id == user_id))


def save(db: Session, profile: Profile) -> Profile:
    db.add(profile)
    db.flush()
    return profile

