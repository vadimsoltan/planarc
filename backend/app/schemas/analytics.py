from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    current_phase_name: str | None
    current_phase_description: str | None
    current_weight_kg: float | None
    seven_day_avg_weight_kg: float | None
    current_waist_cm: float | None
    current_estimated_body_fat_pct: float | None
    current_calorie_target_kcal: int | None
    current_calorie_target_context: str | None
    calorie_target_training_kcal: int | None
    calorie_target_rest_kcal: int | None
    protein_target_min_g: int | None
    protein_target_max_g: int | None
    weekly_avg_calories: float | None
    weekly_avg_protein_g: float | None
    weekly_avg_steps: float | None
    estimated_weekly_weight_loss_rate_kg: float | None
    projected_goal_date: date | None
    goal_weight_kg: float | None
    next_milestone_label: str | None
    progress_toward_next_milestone_pct: float | None
    remaining_to_next_milestone_kg: float | None


class WeightTrendPoint(BaseModel):
    date: date
    weight_kg: float
    seven_day_avg_weight_kg: float


class WaistTrendPoint(BaseModel):
    date: date
    waist_navel_cm: float


class BodyFatTrendPoint(BaseModel):
    date: date
    adjusted_body_fat_pct: float | None
    navy_body_fat_pct: float | None


class AdherenceTrendPoint(BaseModel):
    date: date
    calories_actual: float | None
    calories_target: float | None
    protein_actual_g: float | None
    protein_target_g: float | None
    steps_actual: float | None
    steps_target: float | None


class DashboardAnalyticsResponse(BaseModel):
    summary: DashboardSummary
    weight_series: list[WeightTrendPoint]
    waist_series: list[WaistTrendPoint]
    body_fat_series: list[BodyFatTrendPoint]
    adherence_series: list[AdherenceTrendPoint]


class StrengthHistoryPoint(BaseModel):
    date: date
    estimated_1rm: float
    total_volume: float
    best_weight: float
    best_reps: int


class StrengthExerciseAnalytics(BaseModel):
    exercise_name: str
    category: str | None
    reference_estimated_1rm: float | None
    latest_estimated_1rm: float | None
    best_estimated_1rm: float | None
    strength_recovery_pct: float | None
    latest_volume: float | None
    best_weight: float | None
    best_reps: int | None
    total_sessions: int
    history: list[StrengthHistoryPoint]


class StrengthAnalyticsResponse(BaseModel):
    exercises: list[StrengthExerciseAnalytics]


class ProjectionsResponse(BaseModel):
    projected_goal_date: date | None
    pace_assessment: str
    suggested_calorie_adjustment_kcal: int
    suggested_training_day_calories_kcal: int | None
    suggested_rest_day_calories_kcal: int | None
    suggested_phase_transition_date: date | None
    weekly_target_weight_min_kg: float | None
    weekly_target_weight_max_kg: float | None
    expected_next_measurement_milestone: str | None
    primary_recommendation: str
    warnings: list[str]
