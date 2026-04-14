from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select

from app.models.goal import Goal


def authenticate(client) -> None:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "test-password"})
    assert response.status_code == 204


def create_daily_log(client, payload: dict) -> None:
    response = client.post("/api/daily-logs", json=payload)
    assert response.status_code == 201


def create_measurement(client, payload: dict) -> None:
    response = client.post("/api/measurements", json=payload)
    assert response.status_code == 201


def create_workout(client, payload: dict) -> None:
    response = client.post("/api/workouts", json=payload)
    assert response.status_code == 201


def shift_seeded_goals(client) -> date:
    today = date.today()
    with client.app.state.session_factory() as session:
        goals = list(session.scalars(select(Goal)))

        for goal in goals:
            if goal.period_type == "biweekly":
                goal.start_date = today - timedelta(days=13)
                goal.end_date = today + timedelta(days=1)
            elif goal.period_type == "monthly":
                goal.start_date = today - timedelta(days=29)
                goal.end_date = today + timedelta(days=1)
            elif goal.period_type == "quarterly":
                goal.start_date = today - timedelta(days=29)
                goal.end_date = today + timedelta(days=90)
        session.commit()
    return today


def seed_projection_data(client, today: date) -> None:
    for offset in range(14):
        log_date = today - timedelta(days=13 - offset)
        create_daily_log(
            client,
            {
                "date": log_date.isoformat(),
                "weight_kg": round(95.0 - (0.1 * offset), 1),
                "calories": 2100 if offset % 2 == 0 else 2050,
                "protein_g": 205,
                "steps": 7000 if offset % 2 == 0 else 7200,
                "is_training_day": offset % 2 == 0,
                "notes": None,
            },
        )

    create_measurement(
        client,
        {
            "date": (today - timedelta(days=20)).isoformat(),
            "neck_cm": 36.5,
            "waist_navel_cm": 94,
            "chest_cm": 102,
            "adjusted_body_fat_pct": 21.5,
        },
    )
    create_measurement(
        client,
        {
            "date": today.isoformat(),
            "neck_cm": 36.5,
            "waist_navel_cm": 92,
            "chest_cm": 102,
            "adjusted_body_fat_pct": 20.5,
        },
    )

    create_workout(
        client,
        {
            "date": (today - timedelta(days=20)).isoformat(),
            "workout_type": "push",
            "duration_minutes": 70,
            "notes": None,
            "exercises": [
                {
                    "exercise_name": "Incline Smith Bench",
                    "exercise_order": 1,
                    "category": "compound",
                    "sets": [
                        {"set_number": 1, "weight": 175, "reps": 8, "rir": 2, "notes": None},
                    ],
                }
            ],
        },
    )
    create_workout(
        client,
        {
            "date": (today - timedelta(days=5)).isoformat(),
            "workout_type": "push",
            "duration_minutes": 74,
            "notes": None,
            "exercises": [
                {
                    "exercise_name": "Incline Smith Bench",
                    "exercise_order": 1,
                    "category": "compound",
                    "sets": [
                        {"set_number": 1, "weight": 205, "reps": 8, "rir": 1, "notes": None},
                    ],
                }
            ],
        },
    )


def test_projections_endpoint_returns_rule_based_guidance(client) -> None:
    authenticate(client)
    today = date.today()
    seed_projection_data(client, today)

    response = client.get("/api/analytics/projections")

    assert response.status_code == 200
    body = response.json()
    assert body["pace_assessment"] == "on_track"
    assert body["suggested_calorie_adjustment_kcal"] == 0
    assert body["suggested_training_day_calories_kcal"] == 2200
    assert body["suggested_rest_day_calories_kcal"] == 2000
    assert body["weekly_target_weight_min_kg"] == 92.8
    assert body["weekly_target_weight_max_kg"] == 93.2
    assert body["expected_next_measurement_milestone"] == "Look for the next waist check-in to land around 91.0 cm."
    assert body["primary_recommendation"] == "Continue the current plan. Waist is trending down while strength is stable or improving."
    assert body["warnings"] == []
    assert body["projected_goal_date"] is not None


def test_goals_endpoint_returns_live_computed_statuses(client) -> None:
    authenticate(client)
    today = shift_seeded_goals(client)
    seed_projection_data(client, today)

    response = client.get("/api/goals")

    assert response.status_code == 200
    goals = response.json()
    assert len(goals) == 6

    goals_by_name = {goal["metric_name"]: goal for goal in goals}

    assert goals_by_name["Average weight loss"]["status"] == "ahead"
    assert goals_by_name["Protein average"]["status"] == "on_track"
    assert goals_by_name["Steps average"]["status"] == "off_track"
    assert goals_by_name["Waist change"]["status"] == "on_track"
    assert goals_by_name["Strength recovery"]["status"] == "on_track"
    assert goals_by_name["Phase target weight"]["status"] == "on_track"

    assert goals_by_name["Protein average"]["actual_value"] == 205.0
    assert goals_by_name["Steps average"]["actual_value"] == 7100.0
    assert goals_by_name["Waist change"]["actual_value"] == 2.0
    assert goals_by_name["Strength recovery"]["actual_value"] == 14.9
    assert goals_by_name["Phase target weight"]["target_display"] == "87-88 kg"
