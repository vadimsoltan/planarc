from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from math import ceil

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.daily_log import DailyLog
from app.models.exercise_reference_pr import ExerciseReferencePR
from app.models.measurement import Measurement
from app.models.phase import Phase
from app.models.profile import Profile
from app.models.workout import Workout
from app.repositories import daily_log_repository, measurement_repository, phase_repository, profile_repository, workout_repository
from app.schemas.analytics import (
    AdherenceTrendPoint,
    BodyFatTrendPoint,
    DashboardAnalyticsResponse,
    DashboardSummary,
    ProjectionsResponse,
    StrengthAnalyticsResponse,
    StrengthExerciseAnalytics,
    StrengthHistoryPoint,
    WaistTrendPoint,
    WeightTrendPoint,
)


def build_dashboard_analytics(db: Session, user_id: int) -> DashboardAnalyticsResponse:
    profile = profile_repository.get_by_user_id(db, user_id)
    phases = phase_repository.list_by_user_id(db, user_id)
    daily_logs = list(reversed(daily_log_repository.list_by_user_id(db, user_id)))
    measurements = list(reversed(measurement_repository.list_by_user_id(db, user_id)))

    active_phase = _get_active_phase(phases)
    weight_series = _build_weight_series(daily_logs)
    waist_series = _build_waist_series(measurements)
    body_fat_series = _build_body_fat_series(measurements)
    adherence_series = _build_adherence_series(daily_logs, phases, profile.default_step_target)
    summary = _build_summary(profile, active_phase, daily_logs, measurements, weight_series)

    return DashboardAnalyticsResponse(
        summary=summary,
        weight_series=weight_series,
        waist_series=waist_series,
        body_fat_series=body_fat_series,
        adherence_series=adherence_series,
    )


def build_strength_analytics(db: Session, user_id: int) -> StrengthAnalyticsResponse:
    grouped_history = _build_strength_history_points(db, user_id)
    reference_prs = _get_reference_prs(db, user_id)
    categories = _build_exercise_categories(db, user_id)

    exercises: list[StrengthExerciseAnalytics] = []
    for exercise_name in sorted(grouped_history):
        history = grouped_history[exercise_name]
        reference = reference_prs.get(exercise_name)
        latest_point = history[-1] if history else None
        best_point = max(history, key=lambda point: point.estimated_1rm) if history else None
        strength_recovery_pct = None
        if reference is not None and best_point is not None and reference.estimated_1rm > 0:
            strength_recovery_pct = round((best_point.estimated_1rm / reference.estimated_1rm) * 100, 2)

        exercises.append(
            StrengthExerciseAnalytics(
                exercise_name=exercise_name,
                category=categories.get(exercise_name),
                reference_estimated_1rm=round(reference.estimated_1rm, 2) if reference is not None else None,
                latest_estimated_1rm=latest_point.estimated_1rm if latest_point is not None else None,
                best_estimated_1rm=best_point.estimated_1rm if best_point is not None else None,
                strength_recovery_pct=strength_recovery_pct,
                latest_volume=latest_point.total_volume if latest_point is not None else None,
                best_weight=best_point.best_weight if best_point is not None else None,
                best_reps=best_point.best_reps if best_point is not None else None,
                total_sessions=len(history),
                history=history,
            )
        )

    return StrengthAnalyticsResponse(exercises=exercises)


def build_projections(db: Session, user_id: int) -> ProjectionsResponse:
    profile = profile_repository.get_by_user_id(db, user_id)
    phases = phase_repository.list_by_user_id(db, user_id)
    daily_logs = list(reversed(daily_log_repository.list_by_user_id(db, user_id)))
    measurements = list(reversed(measurement_repository.list_by_user_id(db, user_id)))
    weight_series = _build_weight_series(daily_logs)
    active_phase = _get_active_phase(phases)
    weekly_loss_rate = _estimate_weekly_weight_loss(weight_series)
    projected_goal_date = _project_goal_date(weight_series, profile.current_goal_weight_kg, weekly_loss_rate)
    strength_history = _build_strength_history_map(db, user_id)
    waist_signal = _waist_delta_recent(measurements)
    strength_declining = _recent_strength_decline(strength_history)
    strength_stable_or_up = _recent_strength_stable_or_up(strength_history)

    warnings: list[str] = []
    adjustment = 0
    pace_assessment = "insufficient_data"
    primary_recommendation = "Keep collecting data before making a plan change."

    phase_loss_min = active_phase.target_weekly_loss_min if active_phase is not None else 0.35
    phase_loss_max = active_phase.target_weekly_loss_max if active_phase is not None else 0.8

    if weekly_loss_rate is None:
        warnings.append("Need at least two recent bodyweight entries to estimate pace.")
    else:
        if weekly_loss_rate < 0.35:
            pace_assessment = "behind"
            adjustment = -150
            warnings.append("Weight loss is slower than the initial recomposition rule set.")
            primary_recommendation = "Reduce daily calories by about 150 kcal and recheck the 14-day trend."
        elif weekly_loss_rate > 0.8:
            pace_assessment = "ahead"
            adjustment = 100
            warnings.append("Weight loss is faster than the performance-protection ceiling.")
            primary_recommendation = "Add about 100 kcal/day to protect performance and recovery."
        elif phase_loss_min is not None and phase_loss_max is not None and phase_loss_min <= weekly_loss_rate <= phase_loss_max:
            pace_assessment = "on_track"
            primary_recommendation = "Hold calories steady and keep the current phase running."
        else:
            pace_assessment = "on_track"
            primary_recommendation = "Keep the current plan steady and monitor the next two weeks."

    if weekly_loss_rate is not None and weekly_loss_rate > 0.8 and strength_declining:
        warnings.append("Key lifts are fading while bodyweight is dropping quickly.")
        primary_recommendation = "Increase carbs around training and ease the deficit until lift performance stabilizes."
    elif waist_signal is not None and waist_signal > 0 and strength_stable_or_up:
        primary_recommendation = "Continue the current plan. Waist is trending down while strength is stable or improving."

    current_weight = weight_series[-1].weight_kg if weight_series else None
    weekly_target_weight_min = None
    weekly_target_weight_max = None
    if current_weight is not None and active_phase is not None:
        if active_phase.target_weekly_loss_max is not None:
            weekly_target_weight_min = round(current_weight - active_phase.target_weekly_loss_max, 2)
        if active_phase.target_weekly_loss_min is not None:
            weekly_target_weight_max = round(current_weight - active_phase.target_weekly_loss_min, 2)

    expected_next_measurement_milestone = _expected_measurement_milestone(measurements, profile, active_phase)
    suggested_phase_transition_date = None
    if projected_goal_date is not None:
        suggested_phase_transition_date = projected_goal_date
    elif active_phase is not None:
        suggested_phase_transition_date = active_phase.end_date

    suggested_training_day = None
    suggested_rest_day = None
    if active_phase is not None:
        suggested_training_day = active_phase.calorie_training + adjustment if active_phase.calorie_training is not None else None
        suggested_rest_day = active_phase.calorie_rest + adjustment if active_phase.calorie_rest is not None else None

    return ProjectionsResponse(
        projected_goal_date=projected_goal_date,
        pace_assessment=pace_assessment,
        suggested_calorie_adjustment_kcal=adjustment,
        suggested_training_day_calories_kcal=suggested_training_day,
        suggested_rest_day_calories_kcal=suggested_rest_day,
        suggested_phase_transition_date=suggested_phase_transition_date,
        weekly_target_weight_min_kg=weekly_target_weight_min,
        weekly_target_weight_max_kg=weekly_target_weight_max,
        expected_next_measurement_milestone=expected_next_measurement_milestone,
        primary_recommendation=primary_recommendation,
        warnings=warnings,
    )


def _get_active_phase(phases: list[Phase]) -> Phase | None:
    return next((phase for phase in phases if phase.is_active), phases[0] if phases else None)


def _build_weight_series(daily_logs: list[DailyLog]) -> list[WeightTrendPoint]:
    series: list[WeightTrendPoint] = []
    rolling_weights: list[float] = []
    for log in daily_logs:
        if log.weight_kg is None:
            continue
        rolling_weights.append(log.weight_kg)
        rolling_window = rolling_weights[-7:]
        seven_day_avg = round(sum(rolling_window) / len(rolling_window), 2)
        series.append(
            WeightTrendPoint(
                date=log.date,
                weight_kg=round(log.weight_kg, 2),
                seven_day_avg_weight_kg=seven_day_avg,
            )
        )
    return series


def _build_waist_series(measurements: list[Measurement]) -> list[WaistTrendPoint]:
    return [
        WaistTrendPoint(date=measurement.date, waist_navel_cm=round(measurement.waist_navel_cm, 2))
        for measurement in measurements
        if measurement.waist_navel_cm is not None
    ]


def _build_body_fat_series(measurements: list[Measurement]) -> list[BodyFatTrendPoint]:
    return [
        BodyFatTrendPoint(
            date=measurement.date,
            adjusted_body_fat_pct=round(measurement.adjusted_body_fat_pct, 2)
            if measurement.adjusted_body_fat_pct is not None
            else None,
            navy_body_fat_pct=round(measurement.navy_body_fat_pct, 2) if measurement.navy_body_fat_pct is not None else None,
        )
        for measurement in measurements
        if measurement.adjusted_body_fat_pct is not None or measurement.navy_body_fat_pct is not None
    ]


def _build_adherence_series(
    daily_logs: list[DailyLog],
    phases: list[Phase],
    default_step_target: int,
) -> list[AdherenceTrendPoint]:
    series: list[AdherenceTrendPoint] = []
    for log in daily_logs:
        phase = _phase_for_date(phases, log.date)
        calories_target = None
        if phase is not None:
            calories_target = phase.calorie_training if log.is_training_day else phase.calorie_rest
        protein_target = phase.protein_target_min if phase is not None else None
        series.append(
            AdherenceTrendPoint(
                date=log.date,
                calories_actual=float(log.calories) if log.calories is not None else None,
                calories_target=float(calories_target) if calories_target is not None else None,
                protein_actual_g=round(log.protein_g, 2) if log.protein_g is not None else None,
                protein_target_g=float(protein_target) if protein_target is not None else None,
                steps_actual=float(log.steps) if log.steps is not None else None,
                steps_target=float(default_step_target),
            )
        )
    return series


def _build_summary(
    profile: Profile,
    active_phase: Phase | None,
    daily_logs: list[DailyLog],
    measurements: list[Measurement],
    weight_series: list[WeightTrendPoint],
) -> DashboardSummary:
    latest_log = daily_logs[-1] if daily_logs else None
    current_weight = weight_series[-1].weight_kg if weight_series else None
    seven_day_average = weight_series[-1].seven_day_avg_weight_kg if weight_series else None
    current_waist = _latest_value(measurements, "waist_navel_cm")
    current_body_fat = _latest_adjusted_body_fat(measurements, profile)
    current_calorie_target = None
    current_calorie_target_context = None
    if active_phase is not None:
        is_training_day = latest_log.is_training_day if latest_log is not None else True
        current_calorie_target = active_phase.calorie_training if is_training_day else active_phase.calorie_rest
        current_calorie_target_context = "training day" if is_training_day else "rest day"

    recent_logs = daily_logs[-7:]
    weekly_avg_calories = _average([float(log.calories) for log in recent_logs if log.calories is not None], 2)
    weekly_avg_protein = _average([float(log.protein_g) for log in recent_logs if log.protein_g is not None], 2)
    weekly_avg_steps = _average([float(log.steps) for log in recent_logs if log.steps is not None], 2)
    weekly_loss_rate = _estimate_weekly_weight_loss(weight_series)
    projected_goal_date = _project_goal_date(weight_series, profile.current_goal_weight_kg, weekly_loss_rate)
    next_milestone_label = None
    progress_toward_next_milestone_pct = None
    remaining_to_next_milestone_kg = None
    if active_phase is not None and current_weight is not None and active_phase.target_weight_max is not None:
        next_milestone_label = f"Reach {active_phase.target_weight_max:.1f} kg"
        remaining_to_next_milestone_kg = round(max(current_weight - active_phase.target_weight_max, 0), 2)
        if profile.start_weight_kg != active_phase.target_weight_max:
            progress = (profile.start_weight_kg - current_weight) / (profile.start_weight_kg - active_phase.target_weight_max)
            progress_toward_next_milestone_pct = round(max(0.0, min(progress, 1.0)) * 100, 1)

    return DashboardSummary(
        current_phase_name=active_phase.name if active_phase else None,
        current_phase_description=active_phase.description if active_phase else None,
        current_weight_kg=current_weight,
        seven_day_avg_weight_kg=seven_day_average,
        current_waist_cm=current_waist,
        current_estimated_body_fat_pct=current_body_fat,
        current_calorie_target_kcal=current_calorie_target,
        current_calorie_target_context=current_calorie_target_context,
        calorie_target_training_kcal=active_phase.calorie_training if active_phase else None,
        calorie_target_rest_kcal=active_phase.calorie_rest if active_phase else None,
        protein_target_min_g=active_phase.protein_target_min if active_phase else None,
        protein_target_max_g=active_phase.protein_target_max if active_phase else None,
        weekly_avg_calories=weekly_avg_calories,
        weekly_avg_protein_g=weekly_avg_protein,
        weekly_avg_steps=weekly_avg_steps,
        estimated_weekly_weight_loss_rate_kg=weekly_loss_rate,
        projected_goal_date=projected_goal_date,
        goal_weight_kg=round(profile.current_goal_weight_kg, 2),
        next_milestone_label=next_milestone_label,
        progress_toward_next_milestone_pct=progress_toward_next_milestone_pct,
        remaining_to_next_milestone_kg=remaining_to_next_milestone_kg,
    )


def _latest_value(measurements: list[Measurement], attribute: str) -> float | None:
    for measurement in reversed(measurements):
        value = getattr(measurement, attribute)
        if value is not None:
            return round(value, 2)
    return None


def _latest_adjusted_body_fat(measurements: list[Measurement], profile: Profile) -> float | None:
    for measurement in reversed(measurements):
        if measurement.adjusted_body_fat_pct is not None:
            return round(measurement.adjusted_body_fat_pct, 2)
        if measurement.navy_body_fat_pct is not None:
            return round(measurement.navy_body_fat_pct, 2)

    if profile.adjusted_body_fat_current is not None:
        return round(profile.adjusted_body_fat_current, 2)
    return round(profile.estimated_body_fat_start, 2)


def _average(values: list[float], digits: int) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), digits)


def _estimate_weekly_weight_loss(weight_series: list[WeightTrendPoint]) -> float | None:
    if len(weight_series) < 2:
        return None

    latest_date = weight_series[-1].date
    recent_points = [point for point in weight_series if point.date >= latest_date - timedelta(days=13)]
    if len(recent_points) < 2:
        recent_points = weight_series[-14:]
    if len(recent_points) < 2:
        return None

    origin = recent_points[0].date
    xs = [(point.date - origin).days for point in recent_points]
    ys = [point.weight_kg for point in recent_points]
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)
    denominator = sum((x - mean_x) ** 2 for x in xs)
    if denominator == 0:
        return None

    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / denominator
    return round(-(slope * 7), 2)


def _project_goal_date(
    weight_series: list[WeightTrendPoint],
    goal_weight_kg: float,
    weekly_loss_rate: float | None,
) -> date | None:
    if not weight_series or weekly_loss_rate is None or weekly_loss_rate <= 0:
        return None

    current_weight = weight_series[-1].weight_kg
    if current_weight <= goal_weight_kg:
        return weight_series[-1].date

    daily_rate = weekly_loss_rate / 7
    days_to_goal = ceil((current_weight - goal_weight_kg) / daily_rate)
    return weight_series[-1].date + timedelta(days=days_to_goal)


def _phase_for_date(phases: list[Phase], target_date: date) -> Phase | None:
    for phase in phases:
        if phase.start_date <= target_date and (phase.end_date is None or target_date <= phase.end_date):
            return phase
    return _get_active_phase(phases)


def _estimate_one_rep_max(weight: float, reps: int) -> float:
    return float(weight * (1 + reps / 30))


def _get_reference_prs(db: Session, user_id: int) -> dict[str, ExerciseReferencePR]:
    return {
        reference.exercise_name: reference
        for reference in db.scalars(select(ExerciseReferencePR).where(ExerciseReferencePR.user_id == user_id))
    }


def _build_exercise_categories(db: Session, user_id: int) -> dict[str, str]:
    categories: dict[str, str] = {}
    for workout in list(reversed(workout_repository.list_by_user_id(db, user_id))):
        for exercise in workout.exercises:
            categories.setdefault(exercise.exercise_name, exercise.category)
    return categories


def _build_strength_history_points(db: Session, user_id: int) -> dict[str, list[StrengthHistoryPoint]]:
    workouts = list(reversed(workout_repository.list_by_user_id(db, user_id)))
    grouped_history: dict[str, list[StrengthHistoryPoint]] = {}

    for workout in workouts:
        per_workout: dict[str, dict[str, float | int | str]] = {}
        for exercise in workout.exercises:
            bucket = per_workout.setdefault(
                exercise.exercise_name,
                {
                    "category": exercise.category,
                    "best_estimated_1rm": 0.0,
                    "best_weight": 0.0,
                    "best_reps": 0,
                    "total_volume": 0.0,
                },
            )
            bucket["category"] = exercise.category
            for set_entry in exercise.sets:
                estimated_1rm = _estimate_one_rep_max(set_entry.weight, set_entry.reps)
                total_volume = float(set_entry.weight * set_entry.reps)
                bucket["total_volume"] = float(bucket["total_volume"]) + total_volume
                if estimated_1rm >= float(bucket["best_estimated_1rm"]):
                    bucket["best_estimated_1rm"] = estimated_1rm
                    bucket["best_weight"] = set_entry.weight
                    bucket["best_reps"] = set_entry.reps

        for exercise_name, values in per_workout.items():
            grouped_history.setdefault(exercise_name, []).append(
                StrengthHistoryPoint(
                    date=workout.date,
                    estimated_1rm=round(float(values["best_estimated_1rm"]), 2),
                    total_volume=round(float(values["total_volume"]), 2),
                    best_weight=round(float(values["best_weight"]), 2),
                    best_reps=int(values["best_reps"]),
                )
            )
    return grouped_history


def _build_strength_history_map(db: Session, user_id: int) -> dict[str, list[tuple[date, float]]]:
    reference_prs = _get_reference_prs(db, user_id)
    history_points = _build_strength_history_points(db, user_id)
    history_map: dict[str, list[tuple[date, float]]] = defaultdict(list)
    for exercise_name, history in history_points.items():
        reference = reference_prs.get(exercise_name)
        if reference is None or reference.estimated_1rm <= 0:
            continue
        for point in history:
            recovery = round((point.estimated_1rm / reference.estimated_1rm) * 100, 2)
            history_map[exercise_name].append((point.date, recovery))
    return dict(history_map)


def _waist_delta_recent(measurements: list[Measurement]) -> float | None:
    waist_measurements = [measurement for measurement in measurements if measurement.waist_navel_cm is not None]
    if len(waist_measurements) < 2:
        return None
    recent = waist_measurements[-2:]
    return round(recent[0].waist_navel_cm - recent[1].waist_navel_cm, 2)


def _recent_strength_decline(strength_history: dict[str, list[tuple[date, float]]]) -> bool:
    declines = 0
    checked = 0
    for history in strength_history.values():
        if len(history) < 2:
            continue
        checked += 1
        if history[-1][1] < history[-2][1]:
            declines += 1
    return checked > 0 and declines >= 1


def _recent_strength_stable_or_up(strength_history: dict[str, list[tuple[date, float]]]) -> bool:
    improvements = 0
    checked = 0
    for history in strength_history.values():
        if len(history) < 2:
            continue
        checked += 1
        if history[-1][1] >= history[-2][1]:
            improvements += 1
    return checked > 0 and improvements == checked


def _expected_measurement_milestone(
    measurements: list[Measurement],
    profile: Profile,
    active_phase: Phase | None,
) -> str | None:
    current_body_fat = _latest_adjusted_body_fat(measurements, profile)
    current_waist = _latest_value(measurements, "waist_navel_cm")
    if active_phase is not None and active_phase.target_body_fat_max is not None and current_body_fat is not None:
        if current_body_fat > active_phase.target_body_fat_max:
            return f"Bring estimated body fat under {active_phase.target_body_fat_max:.1f}%."
    if current_waist is not None:
        return f"Look for the next waist check-in to land around {max(current_waist - 1.0, 0):.1f} cm."
    return "Schedule another measurement check-in within the next 7-14 days."
