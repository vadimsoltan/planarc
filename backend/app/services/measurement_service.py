from __future__ import annotations

import math

from app.models.daily_log import DailyLog
from app.models.measurement import Measurement
from app.models.profile import Profile
from app.schemas.measurement import MeasurementCreate, MeasurementUpdate

CM_PER_INCH = 2.54


def _round(value: float | None, digits: int) -> float | None:
    return round(value, digits) if value is not None else None


def compute_navy_body_fat_pct(profile: Profile, waist_navel_cm: float | None, neck_cm: float | None) -> float | None:
    if profile.sex != "male" or waist_navel_cm is None or neck_cm is None:
        return None
    if waist_navel_cm <= neck_cm or profile.height_cm <= 0:
        return None

    waist_in = waist_navel_cm / CM_PER_INCH
    neck_in = neck_cm / CM_PER_INCH
    height_in = profile.height_cm / CM_PER_INCH
    result = 86.010 * math.log10(waist_in - neck_in) - 70.041 * math.log10(height_in) + 36.76
    return _round(result, 2)


def apply_derived_metrics(
    measurement: Measurement,
    payload: MeasurementCreate | MeasurementUpdate,
    profile: Profile,
    reference_weight_kg: float | None,
) -> Measurement:
    measurement.date = payload.date
    measurement.neck_cm = payload.neck_cm
    measurement.waist_navel_cm = payload.waist_navel_cm
    measurement.waist_narrow_cm = payload.waist_narrow_cm
    measurement.chest_cm = payload.chest_cm
    measurement.hips_cm = payload.hips_cm
    measurement.glutes_cm = payload.glutes_cm
    measurement.arm_relaxed_cm = payload.arm_relaxed_cm
    measurement.arm_flexed_cm = payload.arm_flexed_cm
    measurement.thigh_mid_cm = payload.thigh_mid_cm
    measurement.thigh_upper_cm = payload.thigh_upper_cm
    measurement.calf_cm = payload.calf_cm
    measurement.notes = payload.notes

    measurement.navy_body_fat_pct = compute_navy_body_fat_pct(profile, payload.waist_navel_cm, payload.neck_cm)
    measurement.adjusted_body_fat_pct = (
        _round(payload.adjusted_body_fat_pct, 2)
        if payload.adjusted_body_fat_pct is not None
        else measurement.navy_body_fat_pct
    )

    if reference_weight_kg is not None and measurement.adjusted_body_fat_pct is not None:
        measurement.lean_mass_kg = _round(reference_weight_kg * (1 - measurement.adjusted_body_fat_pct / 100), 2)
        measurement.fat_mass_kg = _round(reference_weight_kg * (measurement.adjusted_body_fat_pct / 100), 2)
    else:
        measurement.lean_mass_kg = None
        measurement.fat_mass_kg = None

    measurement.waist_height_ratio = (
        _round(payload.waist_navel_cm / profile.height_cm, 4)
        if payload.waist_navel_cm is not None and profile.height_cm > 0
        else None
    )
    measurement.chest_waist_ratio = (
        _round(payload.chest_cm / payload.waist_navel_cm, 4)
        if payload.chest_cm is not None and payload.waist_navel_cm not in (None, 0)
        else None
    )
    return measurement
