from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise


def list_by_user_id(db: Session, user_id: int) -> list[Workout]:
    stmt = (
        select(Workout)
        .where(Workout.user_id == user_id)
        .options(selectinload(Workout.exercises).selectinload(WorkoutExercise.sets))
        .order_by(desc(Workout.date), desc(Workout.id))
    )
    result = db.scalars(stmt)
    return list(result)


def get_by_id_for_user(db: Session, user_id: int, workout_id: int) -> Workout | None:
    stmt = (
        select(Workout)
        .where(Workout.id == workout_id, Workout.user_id == user_id)
        .options(selectinload(Workout.exercises).selectinload(WorkoutExercise.sets))
    )
    return db.scalar(stmt)


def save(db: Session, workout: Workout) -> Workout:
    db.add(workout)
    db.flush()
    return workout


def delete(db: Session, workout: Workout) -> None:
    db.delete(workout)
    db.flush()
