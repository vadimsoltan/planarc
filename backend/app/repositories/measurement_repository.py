from __future__ import annotations

from datetime import date

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.measurement import Measurement


def list_by_user_id(
    db: Session,
    user_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[Measurement]:
    stmt = select(Measurement).where(Measurement.user_id == user_id)
    if start_date is not None:
        stmt = stmt.where(Measurement.date >= start_date)
    if end_date is not None:
        stmt = stmt.where(Measurement.date <= end_date)

    result = db.scalars(stmt.order_by(desc(Measurement.date), desc(Measurement.id)))
    return list(result)


def get_by_id_for_user(db: Session, user_id: int, measurement_id: int) -> Measurement | None:
    stmt = select(Measurement).where(Measurement.id == measurement_id, Measurement.user_id == user_id)
    return db.scalar(stmt)


def save(db: Session, measurement: Measurement) -> Measurement:
    db.add(measurement)
    db.flush()
    return measurement


def delete(db: Session, measurement: Measurement) -> None:
    db.delete(measurement)
    db.flush()

