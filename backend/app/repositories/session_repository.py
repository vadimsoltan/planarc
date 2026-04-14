from __future__ import annotations

from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.auth_session import AuthSession


def create_session(db: Session, user_id: int, token_hash: str, expires_at: datetime) -> AuthSession:
    session = AuthSession(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
    db.add(session)
    db.flush()
    return session


def get_by_token_hash(db: Session, token_hash: str) -> AuthSession | None:
    return db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash))


def delete_by_token_hash(db: Session, token_hash: str) -> None:
    db.execute(delete(AuthSession).where(AuthSession.token_hash == token_hash))


def delete_expired(db: Session, now: datetime) -> None:
    db.execute(delete(AuthSession).where(AuthSession.expires_at <= now))

