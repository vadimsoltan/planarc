from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import User


def count_users(db: Session) -> int:
    return db.scalar(select(func.count(User.id))) or 0


def get_first_user(db: Session) -> User | None:
    return db.scalar(select(User).order_by(User.id))


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == username))

