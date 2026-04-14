from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict


class PhaseRead(BaseModel):
    id: int
    user_id: int
    name: str
    description: str | None
    start_date: date
    end_date: date | None
    calorie_training: int | None
    calorie_rest: int | None
    protein_target_min: int | None
    protein_target_max: int | None
    fat_target: int | None
    carb_target_training: int | None
    carb_target_rest: int | None
    target_weight_min: float | None
    target_weight_max: float | None
    target_body_fat_min: float | None
    target_body_fat_max: float | None
    target_weekly_loss_min: float | None
    target_weekly_loss_max: float | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

