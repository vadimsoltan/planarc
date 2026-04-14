from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class DailyLogBase(BaseModel):
    date: date
    weight_kg: float | None = Field(default=None, ge=0, le=500)
    calories: int | None = Field(default=None, ge=0, le=10000)
    protein_g: float | None = Field(default=None, ge=0, le=1000)
    carbs_g: float | None = Field(default=None, ge=0, le=1000)
    fat_g: float | None = Field(default=None, ge=0, le=500)
    steps: int | None = Field(default=None, ge=0, le=100000)
    cardio_minutes: int | None = Field(default=None, ge=0, le=1440)
    cardio_type: str | None = Field(default=None, max_length=120)
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    is_training_day: bool = False
    notes: str | None = Field(default=None, max_length=4000)


class DailyLogCreate(DailyLogBase):
    pass


class DailyLogUpdate(DailyLogBase):
    pass


class DailyLogRead(DailyLogBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)

