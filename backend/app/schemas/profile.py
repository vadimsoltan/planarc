from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class SexValue(StrEnum):
    male = "male"
    female = "female"
    other = "other"


class ProfileRead(BaseModel):
    id: int
    user_id: int
    age: int
    sex: SexValue
    height_cm: float
    start_weight_kg: float
    current_goal_weight_kg: float
    estimated_body_fat_start: float
    adjusted_body_fat_current: float | None
    default_step_target: int
    default_training_days_per_week: int

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    height_cm: float = Field(gt=0)
    age: int = Field(ge=0, le=120)
    sex: SexValue
    start_weight_kg: float = Field(gt=0)
    current_goal_weight_kg: float = Field(gt=0)
    adjusted_body_fat_current: float | None = Field(default=None, ge=0, le=100)
    default_training_days_per_week: int = Field(ge=0, le=14)
    default_step_target: int = Field(ge=0, le=100000)

