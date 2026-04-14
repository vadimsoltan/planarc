from __future__ import annotations

from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import generate_session_token, hash_session_token, verify_password
from app.models.user import User
from app.models.mixins import utcnow
from app.repositories import session_repository, user_repository


class AuthenticationError(Exception):
    pass


def authenticate_user(db: Session, username: str, password: str, settings: Settings) -> tuple[User, str]:
    user = user_repository.get_by_username(db, username)
    if user is None or not verify_password(password, user.password_hash):
        raise AuthenticationError("Invalid credentials")

    now = utcnow()
    session_repository.delete_expired(db, now)

    token = generate_session_token()
    session_repository.create_session(
        db,
        user_id=user.id,
        token_hash=hash_session_token(token),
        expires_at=now + timedelta(hours=settings.session_ttl_hours),
    )
    db.commit()
    return user, token


def get_user_from_session_token(db: Session, token: str | None) -> User | None:
    if not token:
        return None

    record = session_repository.get_by_token_hash(db, hash_session_token(token))
    if record is None:
        return None

    now = utcnow()
    if record.expires_at <= now:
        session_repository.delete_by_token_hash(db, record.token_hash)
        db.commit()
        return None

    return record.user


def invalidate_session(db: Session, token: str | None) -> None:
    if token:
        session_repository.delete_by_token_hash(db, hash_session_token(token))
    db.commit()

