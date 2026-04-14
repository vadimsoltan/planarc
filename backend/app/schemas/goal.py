from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class GoalStatusRead(BaseModel):
    id: int
    user_id: int
    period_type: str
    metric_name: str
    start_date: date
    end_date: date
    target_value: float | None
    min_value: float | None
    max_value: float | None
    unit: str
    status: str
    actual_value: float | None
    progress_pct: float | None
    target_display: str
    status_reason: str | None
