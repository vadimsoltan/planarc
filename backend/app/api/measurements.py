from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.measurement import Measurement
from app.models.user import User
from app.repositories import daily_log_repository, measurement_repository, profile_repository
from app.schemas.measurement import MeasurementCreate, MeasurementRead, MeasurementUpdate
from app.services.measurement_service import apply_derived_metrics

router = APIRouter(prefix="/measurements", tags=["measurements"])


@router.get("", response_model=list[MeasurementRead])
def list_measurements(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MeasurementRead]:
    measurements = measurement_repository.list_by_user_id(db, current_user.id, start_date=start_date, end_date=end_date)
    return [MeasurementRead.model_validate(measurement) for measurement in measurements]


@router.post("", response_model=MeasurementRead, status_code=status.HTTP_201_CREATED)
def create_measurement(
    payload: MeasurementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeasurementRead:
    profile = profile_repository.get_by_user_id(db, current_user.id)
    measurement = Measurement(user_id=current_user.id)
    reference_weight = daily_log_repository.get_latest_weight_on_or_before(db, current_user.id, payload.date)
    apply_derived_metrics(measurement, payload, profile, reference_weight)
    measurement_repository.save(db, measurement)
    db.commit()
    db.refresh(measurement)
    return MeasurementRead.model_validate(measurement)


@router.put("/{measurement_id}", response_model=MeasurementRead)
def update_measurement(
    measurement_id: int,
    payload: MeasurementUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeasurementRead:
    measurement = measurement_repository.get_by_id_for_user(db, current_user.id, measurement_id)
    if measurement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Measurement not found")

    profile = profile_repository.get_by_user_id(db, current_user.id)
    reference_weight = daily_log_repository.get_latest_weight_on_or_before(db, current_user.id, payload.date)
    apply_derived_metrics(measurement, payload, profile, reference_weight)
    measurement_repository.save(db, measurement)
    db.commit()
    db.refresh(measurement)
    return MeasurementRead.model_validate(measurement)


@router.delete("/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_measurement(
    measurement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    measurement = measurement_repository.get_by_id_for_user(db, current_user.id, measurement_id)
    if measurement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Measurement not found")

    measurement_repository.delete(db, measurement)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
