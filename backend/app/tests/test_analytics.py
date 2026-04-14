from __future__ import annotations

from math import isclose


def authenticate(client) -> None:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "test-password"})
    assert response.status_code == 204


def create_daily_log(client, payload: dict) -> None:
    response = client.post("/api/daily-logs", json=payload)
    assert response.status_code == 201


def create_measurement(client, payload: dict) -> None:
    response = client.post("/api/measurements", json=payload)
    assert response.status_code == 201


def test_dashboard_analytics_returns_summary_and_chart_series(client) -> None:
    authenticate(client)

    logs = [
        ("2026-04-01", 95.0, 2200, 200, 8200, True),
        ("2026-04-02", 94.8, 2100, 198, 7800, False),
        ("2026-04-03", 94.7, 2150, 205, 8600, True),
        ("2026-04-04", 94.5, 2050, 202, 9000, False),
        ("2026-04-05", 94.3, 2200, 210, 8300, True),
        ("2026-04-06", 94.1, 2000, 195, 9500, False),
        ("2026-04-07", 93.9, 2100, 207, 8800, True),
        ("2026-04-08", 93.8, 2050, 204, 9100, False),
    ]
    for log_date, weight, calories, protein, steps, is_training_day in logs:
        create_daily_log(
            client,
            {
                "date": log_date,
                "weight_kg": weight,
                "calories": calories,
                "protein_g": protein,
                "steps": steps,
                "is_training_day": is_training_day,
            },
        )

    create_measurement(
        client,
        {
            "date": "2026-04-04",
            "neck_cm": 36.5,
            "waist_navel_cm": 94,
            "chest_cm": 102,
            "adjusted_body_fat_pct": 21.0,
        },
    )
    create_measurement(
        client,
        {
            "date": "2026-04-08",
            "neck_cm": 36.5,
            "waist_navel_cm": 92,
            "chest_cm": 102,
            "adjusted_body_fat_pct": 20.2,
        },
    )

    response = client.get("/api/analytics/dashboard")

    assert response.status_code == 200
    body = response.json()
    summary = body["summary"]
    assert summary["current_phase_name"] == "Aggressive Recomp"
    assert isclose(summary["current_weight_kg"], 93.8, abs_tol=0.01)
    assert isclose(summary["seven_day_avg_weight_kg"], 94.3, abs_tol=0.01)
    assert isclose(summary["current_waist_cm"], 92.0, abs_tol=0.01)
    assert isclose(summary["current_estimated_body_fat_pct"], 20.2, abs_tol=0.01)
    assert summary["current_calorie_target_kcal"] == 2000
    assert summary["current_calorie_target_context"] == "rest day"
    assert summary["calorie_target_training_kcal"] == 2200
    assert summary["calorie_target_rest_kcal"] == 2000
    assert summary["protein_target_min_g"] == 200
    assert summary["protein_target_max_g"] == 210
    assert isclose(summary["weekly_avg_calories"], 2092.86, abs_tol=0.01)
    assert isclose(summary["weekly_avg_protein_g"], 203.0, abs_tol=0.01)
    assert isclose(summary["weekly_avg_steps"], 8728.57, abs_tol=0.01)
    assert isclose(summary["estimated_weekly_weight_loss_rate_kg"], 1.24, abs_tol=0.01)
    assert summary["projected_goal_date"] == "2026-05-17"
    assert summary["next_milestone_label"] == "Reach 88.0 kg"
    assert isclose(summary["progress_toward_next_milestone_pct"], 17.1, abs_tol=0.1)
    assert isclose(summary["remaining_to_next_milestone_kg"], 5.8, abs_tol=0.01)

    assert len(body["weight_series"]) == 8
    assert body["weight_series"][-1]["date"] == "2026-04-08"
    assert isclose(body["weight_series"][-1]["seven_day_avg_weight_kg"], 94.3, abs_tol=0.01)
    assert len(body["waist_series"]) == 2
    assert body["waist_series"][-1]["waist_navel_cm"] == 92.0
    assert len(body["body_fat_series"]) == 2
    assert body["body_fat_series"][-1]["adjusted_body_fat_pct"] == 20.2
    assert len(body["adherence_series"]) == 8
    assert body["adherence_series"][-1]["calories_target"] == 2000.0
    assert body["adherence_series"][-1]["protein_target_g"] == 200.0
    assert body["adherence_series"][-1]["steps_target"] == 8000.0


def test_dashboard_analytics_handles_missing_logging_data(client) -> None:
    authenticate(client)

    response = client.get("/api/analytics/dashboard")

    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["current_weight_kg"] is None
    assert body["summary"]["seven_day_avg_weight_kg"] is None
    assert body["summary"]["estimated_weekly_weight_loss_rate_kg"] is None
    assert body["summary"]["projected_goal_date"] is None
    assert body["weight_series"] == []
    assert body["waist_series"] == []
    assert body["body_fat_series"] == []
    assert body["adherence_series"] == []
