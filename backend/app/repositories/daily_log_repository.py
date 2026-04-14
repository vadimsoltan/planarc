from __future__ import annotations

from datetime import date

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.daily_log import DailyLog


def list_by_user_id(db: Session, user_id: int, start_date: date | None = None, end_date: date | None = None) -> list[DailyLog]:
    stmt = select(DailyLog).where(DailyLog.user_id == user_id)
    if start_date is not None:
        stmt = stmt.where(DailyLog.date >= start_date)
    if end_date is not None:
        stmt = stmt.where(DailyLog.date <= end_date)

    result = db.scalars(stmt.order_by(desc(DailyLog.date), desc(DailyLog.id)))
    return list(result)


def get_by_id_for_user(db: Session, user_id: int, daily_log_id: int) -> DailyLog | None:
    stmt = select(DailyLog).where(DailyLog.id == daily_log_id, DailyLog.user_id == user_id)
    return db.scalar(stmt)


def get_by_date_for_user(db: Session, user_id: int, log_date: date) -> DailyLog | None:
    stmt = select(DailyLog).where(DailyLog.user_id == user_id, DailyLog.date == log_date)
    return db.scalar(stmt)


def get_latest_weight_on_or_before(db: Session, user_id: int, on_or_before: date) -> float | None:
    stmt = (
        select(DailyLog.weight_kg)
        .where(DailyLog.user_id == user_id, DailyLog.date <= on_or_before, DailyLog.weight_kg.is_not(None))
        .order_by(desc(DailyLog.date), desc(DailyLog.id))
        .limit(1)
    )
    return db.scalar(stmt)


def save(db: Session, daily_log: DailyLog) -> DailyLog:
    db.add(daily_log)
    db.flush()
    return daily_log


def delete(db: Session, daily_log: DailyLog) -> None:
    db.delete(daily_log)
    db.flush()

