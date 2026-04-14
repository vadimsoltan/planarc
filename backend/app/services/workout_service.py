from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.schemas.workout import WorkoutCreate, WorkoutExerciseCreate, WorkoutExerciseUpdate, WorkoutUpdate


def apply_workout_payload(db: Session, workout: Workout, payload: WorkoutCreate | WorkoutUpdate) -> None:
    workout.date = payload.date
    workout.workout_type = payload.workout_type
    workout.duration_minutes = payload.duration_minutes
    workout.notes = payload.notes

    if workout.id is not None and workout.exercises:
        workout.exercises.clear()
        db.flush()

    workout.exercises.extend(_build_exercises(payload.exercises))


def _build_exercises(exercises: list[WorkoutExerciseCreate] | list[WorkoutExerciseUpdate]) -> list[WorkoutExercise]:
    return [
        WorkoutExercise(
            exercise_name=exercise.exercise_name,
            exercise_order=exercise.exercise_order,
            category=exercise.category,
            sets=[
                WorkoutSet(
                    set_number=set_payload.set_number,
                    weight=set_payload.weight,
                    reps=set_payload.reps,
                    rir=set_payload.rir,
                    notes=set_payload.notes,
                )
                for set_payload in exercise.sets
            ],
        )
        for exercise in exercises
    ]
