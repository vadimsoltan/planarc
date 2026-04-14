from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class MeasurementBase(BaseModel):
    date: date
    neck_cm: float | None = Field(default=None, ge=20, le=60)
    waist_navel_cm: float | None = Field(default=None, ge=40, le=200)
    waist_narrow_cm: float | None = Field(default=None, ge=40, le=200)
    chest_cm: float | None = Field(default=None, ge=40, le=200)
    hips_cm: float | None = Field(default=None, ge=40, le=200)
    glutes_cm: float | None = Field(default=None, ge=40, le=200)
    arm_relaxed_cm: float | None = Field(default=None, ge=15, le=70)
    arm_flexed_cm: float | None = Field(default=None, ge=15, le=70)
    thigh_mid_cm: float | None = Field(default=None, ge=20, le=100)
    thigh_upper_cm: float | None = Field(default=None, ge=20, le=100)
    calf_cm: float | None = Field(default=None, ge=20, le=70)
    adjusted_body_fat_pct: float | None = Field(default=None, ge=0, le=100)
    notes: str | None = Field(default=None, max_length=4000)


class MeasurementCreate(MeasurementBase):
    pass


class MeasurementUpdate(MeasurementBase):
    pass


class MeasurementRead(MeasurementBase):
    id: int
    user_id: int
    navy_body_fat_pct: float | None
    lean_mass_kg: float | None
    fat_mass_kg: float | None
    waist_height_ratio: float | None
    chest_waist_ratio: float | None

    model_config = ConfigDict(from_attributes=True)

