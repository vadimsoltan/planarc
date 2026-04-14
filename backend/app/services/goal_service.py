from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.daily_log import DailyLog
from app.models.goal import Goal
from app.models.measurement import Measurement
from app.models.phase import Phase
from app.models.profile import Profile
from app.repositories import daily_log_repository, goal_repository, measurement_repository, phase_repository, profile_repository
from app.schemas.goal import GoalStatusRead
from app.services.analytics_service import _average, _estimate_weekly_weight_loss, _project_goal_date, _build_strength_history_map


def build_goal_statuses(db: Session, user_id: int) -> list[GoalStatusRead]:
    today = date.today()
    profile = profile_repository.get_by_user_id(db, user_id)
    phases = phase_repository.list_by_user_id(db, user_id)
    goals = goal_repository.list_by_user_id(db, user_id)
    daily_logs = list(reversed(daily_log_repository.list_by_user_id(db, user_id)))
    measurements = list(reversed(measurement_repository.list_by_user_id(db, user_id)))
    strength_history = _build_strength_history_map(db, user_id)

    return [
        _build_goal_status(
            goal=goal,
            today=today,
            profile=profile,
            phases=phases,
            daily_logs=daily_logs,
            measurements=measurements,
            strength_history=strength_history,
        )
        for goal in goals
    ]


def _build_goal_status(
    goal: Goal,
    today: date,
    profile: Profile,
    phases: list[Phase],
    daily_logs: list[DailyLog],
    measurements: list[Measurement],
    strength_history: dict[str, list[tuple[date, float]]],
) -> GoalStatusRead:
    window_end = min(goal.end_date, today)
    logs_in_period = [log for log in daily_logs if goal.start_date <= log.date <= window_end]
    measurements_in_period = [measurement for measurement in measurements if goal.start_date <= measurement.date <= window_end]
    active_phase = next((phase for phase in phases if phase.is_active), phases[0] if phases else None)

    status = "caution"
    actual_value: float | None = None
    progress_pct: float | None = None
    status_reason: str | None = None

    if goal.metric_name == "Average weight loss":
        actual_value = _weight_loss_rate_for_period(logs_in_period)
        status, progress_pct = _status_for_minimum(actual_value, goal.min_value)
        status_reason = (
            "Need at least two weigh-ins inside the goal window."
            if actual_value is None
            else f"Average pace is {actual_value:.2f} {goal.unit} against a minimum of {goal.min_value:.2f}."
        )
    elif goal.metric_name == "Protein average":
        actual_value = _average([float(log.protein_g) for log in logs_in_period if log.protein_g is not None], 2)
        status, progress_pct = _status_for_minimum(actual_value, goal.min_value)
        status_reason = (
            "Need logged protein entries inside the goal window."
            if actual_value is None
            else f"Average protein is {actual_value:.1f} {goal.unit} against a minimum of {goal.min_value:.0f}."
        )
    elif goal.metric_name == "Steps average":
        actual_value = _average([float(log.steps) for log in logs_in_period if log.steps is not None], 2)
        status, progress_pct = _status_for_minimum(actual_value, goal.min_value)
        status_reason = (
            "Need logged step counts inside the goal window."
            if actual_value is None
            else f"Average steps are {actual_value:.0f} {goal.unit} against a minimum of {goal.min_value:.0f}."
        )
    elif goal.metric_name == "Waist change":
        actual_value = _waist_change_for_period(goal.start_date, window_end, measurements)
        status, progress_pct = _status_for_range(actual_value, goal.min_value, goal.max_value)
        status_reason = (
            "Need a waist measurement near the start and end of the goal window."
            if actual_value is None
            else f"Waist change is {actual_value:.2f} {goal.unit} versus the target range {goal.min_value:.1f}-{goal.max_value:.1f}."
        )
    elif goal.metric_name == "Strength recovery":
        actual_value = _strength_recovery_change_for_period(goal.start_date, window_end, strength_history)
        status, progress_pct = _status_for_range(actual_value, goal.min_value, goal.max_value)
        status_reason = (
            "Need at least two strength check-ins inside the goal window."
            if actual_value is None
            else f"Strength recovery has improved by {actual_value:.2f} {goal.unit} during this goal window."
        )
    elif goal.metric_name == "Phase target weight":
        latest_weight = next((log.weight_kg for log in reversed(daily_logs) if log.weight_kg is not None and log.date <= window_end), None)
        actual_value = round(latest_weight, 2) if latest_weight is not None else None
        weekly_loss_rate = _weight_loss_rate_for_period(logs_in_period) or _estimate_weekly_weight_loss_for_all(daily_logs)
        projected_goal_date = _project_goal_date_from_logs(daily_logs, profile.current_goal_weight_kg, weekly_loss_rate)
        status, progress_pct = _status_for_weight_target(actual_value, goal.min_value, goal.max_value, projected_goal_date, goal.end_date, profile)
        status_reason = (
            "Need weigh-ins to estimate whether the phase target is reachable."
            if actual_value is None
            else f"Latest weight is {actual_value:.2f} {goal.unit}; projected goal date is {projected_goal_date.isoformat() if projected_goal_date else 'unknown'}."
        )
    else:
        status = goal.status
        status_reason = "Using the seeded status until a live rule is defined."

    if goal.metric_name == "Phase target weight" and active_phase and actual_value is not None and progress_pct is None:
        progress_pct = _weight_progress_pct(profile.start_weight_kg, actual_value, active_phase.target_weight_max)

    return GoalStatusRead(
        id=goal.id,
        user_id=goal.user_id,
        period_type=goal.period_type,
        metric_name=goal.metric_name,
        start_date=goal.start_date,
        end_date=goal.end_date,
        target_value=goal.target_value,
        min_value=goal.min_value,
        max_value=goal.max_value,
        unit=goal.unit,
        status=status,
        actual_value=actual_value,
        progress_pct=progress_pct,
        target_display=_format_goal_target(goal),
        status_reason=status_reason,
    )


def _weight_loss_rate_for_period(logs: list[DailyLog]) -> float | None:
    weighted_logs = [log for log in logs if log.weight_kg is not None]
    if len(weighted_logs) < 2:
        return None
    start = weighted_logs[0]
    end = weighted_logs[-1]
    span_days = (end.date - start.date).days
    if span_days <= 0:
        return None
    return round(((start.weight_kg - end.weight_kg) / span_days) * 7, 2)


def _estimate_weekly_weight_loss_for_all(daily_logs: list[DailyLog]) -> float | None:
    weighted_logs = [log for log in daily_logs if log.weight_kg is not None]
    if len(weighted_logs) < 2:
        return None
    weight_series = [
        type("WeightPoint", (), {"date": log.date, "weight_kg": log.weight_kg})()  # lightweight stand-in
        for log in weighted_logs
    ]
    return _estimate_weekly_weight_loss(weight_series)


def _project_goal_date_from_logs(daily_logs: list[DailyLog], goal_weight_kg: float, weekly_loss_rate: float | None) -> date | None:
    weighted_logs = [log for log in daily_logs if log.weight_kg is not None]
    if not weighted_logs:
        return None
    weight_series = [
        type("WeightPoint", (), {"date": log.date, "weight_kg": log.weight_kg})()  # lightweight stand-in
        for log in weighted_logs
    ]
    return _project_goal_date(weight_series, goal_weight_kg, weekly_loss_rate)


def _waist_change_for_period(start_date: date, end_date: date, measurements: list[Measurement]) -> float | None:
    start_measurement = next(
        (measurement for measurement in measurements if measurement.date >= start_date and measurement.waist_navel_cm is not None),
        None,
    )
    if start_measurement is None:
        start_measurement = next(
            (measurement for measurement in reversed(measurements) if measurement.date < start_date and measurement.waist_navel_cm is not None),
            None,
        )

    end_measurement = next(
        (measurement for measurement in reversed(measurements) if measurement.date <= end_date and measurement.waist_navel_cm is not None),
        None,
    )

    if start_measurement is None or end_measurement is None or end_measurement.date <= start_measurement.date:
        return None
    return round(start_measurement.waist_navel_cm - end_measurement.waist_navel_cm, 2)


def _strength_recovery_change_for_period(
    start_date: date,
    end_date: date,
    strength_history: dict[str, list[tuple[date, float]]],
) -> float | None:
    deltas: list[float] = []
    for history in strength_history.values():
        start_point = next((point for point in history if point[0] >= start_date), None)
        end_point = next((point for point in reversed(history) if point[0] <= end_date), None)
        if start_point is None or end_point is None or end_point[0] <= start_point[0]:
            continue
        deltas.append(end_point[1] - start_point[1])
    if not deltas:
        return None
    return round(sum(deltas) / len(deltas), 2)


def _status_for_minimum(actual_value: float | None, minimum: float | None) -> tuple[str, float | None]:
    if actual_value is None or minimum is None or minimum <= 0:
        return "caution", None
    progress_pct = round((actual_value / minimum) * 100, 1)
    if actual_value >= minimum * 1.05:
        return "ahead", progress_pct
    if actual_value >= minimum:
        return "on_track", progress_pct
    if actual_value >= minimum * 0.9:
        return "caution", progress_pct
    return "off_track", progress_pct


def _status_for_range(actual_value: float | None, minimum: float | None, maximum: float | None) -> tuple[str, float | None]:
    if actual_value is None:
        return "caution", None
    if minimum is not None and maximum is not None:
        if minimum <= actual_value <= maximum:
            midpoint = (minimum + maximum) / 2
            progress_pct = round((actual_value / midpoint) * 100, 1) if midpoint > 0 else None
            return "on_track", progress_pct
        if actual_value > maximum:
            progress_pct = round((actual_value / maximum) * 100, 1) if maximum > 0 else None
            return "ahead", progress_pct
        threshold = minimum * 0.75 if minimum is not None else None
        progress_pct = round((actual_value / minimum) * 100, 1) if minimum and minimum > 0 else None
        if threshold is not None and actual_value >= threshold:
            return "caution", progress_pct
        return "off_track", progress_pct
    return _status_for_minimum(actual_value, minimum)


def _status_for_weight_target(
    actual_weight: float | None,
    minimum: float | None,
    maximum: float | None,
    projected_goal_date: date | None,
    target_end_date: date,
    profile: Profile,
) -> tuple[str, float | None]:
    if actual_weight is None:
        return "caution", None
    progress_pct = _weight_progress_pct(profile.start_weight_kg, actual_weight, maximum)
    if minimum is not None and maximum is not None and minimum <= actual_weight <= maximum:
        return "on_track", progress_pct
    if minimum is not None and actual_weight < minimum:
        return "ahead", progress_pct
    if projected_goal_date is not None and projected_goal_date <= target_end_date:
        return "on_track", progress_pct
    if projected_goal_date is not None and projected_goal_date <= target_end_date + timedelta(days=14):
        return "caution", progress_pct
    return "off_track", progress_pct


def _weight_progress_pct(start_weight: float, actual_weight: float, target_weight_max: float | None) -> float | None:
    if target_weight_max is None or start_weight == target_weight_max:
        return None
    progress = (start_weight - actual_weight) / (start_weight - target_weight_max)
    return round(max(0.0, min(progress, 1.0)) * 100, 1)


def _format_goal_target(goal: Goal) -> str:
    if goal.target_value is not None:
        return f"{goal.target_value:g} {goal.unit}"
    if goal.min_value is not None and goal.max_value is not None:
        return f"{goal.min_value:g}-{goal.max_value:g} {goal.unit}"
    if goal.min_value is not None:
        return f">= {goal.min_value:g} {goal.unit}"
    if goal.max_value is not None:
        return f"<= {goal.max_value:g} {goal.unit}"
    return goal.unit
