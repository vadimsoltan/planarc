from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.workout import Workout
from app.repositories import workout_repository
from app.schemas.workout import WorkoutCreate, WorkoutRead, WorkoutUpdate
from app.services.workout_service import apply_workout_payload

router = APIRouter(prefix="/workouts", tags=["workouts"])


@router.get("", response_model=list[WorkoutRead])
def list_workouts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WorkoutRead]:
    workouts = workout_repository.list_by_user_id(db, current_user.id)
    return [WorkoutRead.model_validate(workout) for workout in workouts]


@router.get("/{workout_id}", response_model=WorkoutRead)
def get_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkoutRead:
    workout = workout_repository.get_by_id_for_user(db, current_user.id, workout_id)
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")

    return WorkoutRead.model_validate(workout)


@router.post("", response_model=WorkoutRead, status_code=status.HTTP_201_CREATED)
def create_workout(
    payload: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkoutRead:
    workout = Workout(user_id=current_user.id)
    apply_workout_payload(db, workout, payload)
    workout_repository.save(db, workout)
    db.commit()
    workout = workout_repository.get_by_id_for_user(db, current_user.id, workout.id)
    assert workout is not None
    return WorkoutRead.model_validate(workout)


@router.put("/{workout_id}", response_model=WorkoutRead)
def update_workout(
    workout_id: int,
    payload: WorkoutUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkoutRead:
    workout = workout_repository.get_by_id_for_user(db, current_user.id, workout_id)
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")

    apply_workout_payload(db, workout, payload)
    workout_repository.save(db, workout)
    db.commit()
    workout = workout_repository.get_by_id_for_user(db, current_user.id, workout_id)
    assert workout is not None
    return WorkoutRead.model_validate(workout)


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    workout = workout_repository.get_by_id_for_user(db, current_user.id, workout_id)
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")

    workout_repository.delete(db, workout)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
