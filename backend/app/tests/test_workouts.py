from __future__ import annotations

from math import isclose


def authenticate(client) -> None:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "test-password"})
    assert response.status_code == 204


def test_workout_crud_with_nested_exercises_and_sets(client) -> None:
    authenticate(client)

    create_response = client.post(
        "/api/workouts",
        json={
            "date": "2026-04-11",
            "workout_type": "push",
            "duration_minutes": 78,
            "notes": "First structured push day.",
            "exercises": [
                {
                    "exercise_name": "Incline Smith Bench",
                    "exercise_order": 1,
                    "category": "compound",
                    "sets": [
                        {"set_number": 1, "weight": 185, "reps": 8, "rir": 2, "notes": None},
                        {"set_number": 2, "weight": 195, "reps": 6, "rir": 1, "notes": "Top set"},
                    ],
                },
                {
                    "exercise_name": "Tricep Pushdown",
                    "exercise_order": 2,
                    "category": "isolation",
                    "sets": [
                        {"set_number": 1, "weight": 100, "reps": 12, "rir": 2, "notes": None},
                    ],
                },
            ],
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["workout_type"] == "push"
    assert len(created["exercises"]) == 2
    assert created["exercises"][0]["exercise_name"] == "Incline Smith Bench"
    assert len(created["exercises"][0]["sets"]) == 2

    list_response = client.get("/api/workouts")
    assert list_response.status_code == 200
    listed = list_response.json()
    assert len(listed) == 1
    assert listed[0]["id"] == created["id"]

    detail_response = client.get(f"/api/workouts/{created['id']}")
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["notes"] == "First structured push day."
    assert detail["exercises"][1]["exercise_name"] == "Tricep Pushdown"

    update_response = client.put(
        f"/api/workouts/{created['id']}",
        json={
            "date": "2026-04-12",
            "workout_type": "upper",
            "duration_minutes": 82,
            "notes": "Expanded into an upper day.",
            "exercises": [
                {
                    "exercise_name": "Incline Smith Bench",
                    "exercise_order": 1,
                    "category": "compound",
                    "sets": [
                        {"set_number": 1, "weight": 205, "reps": 5, "rir": 1, "notes": "Heavier top set"},
                    ],
                },
                {
                    "exercise_name": "Lat Pulldown",
                    "exercise_order": 2,
                    "category": "compound",
                    "sets": [
                        {"set_number": 1, "weight": 140, "reps": 8, "rir": 2, "notes": None},
                        {"set_number": 2, "weight": 130, "reps": 10, "rir": 2, "notes": None},
                    ],
                },
            ],
        },
    )

    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["date"] == "2026-04-12"
    assert updated["workout_type"] == "upper"
    assert [exercise["exercise_name"] for exercise in updated["exercises"]] == ["Incline Smith Bench", "Lat Pulldown"]
    assert len(updated["exercises"][1]["sets"]) == 2

    delete_response = client.delete(f"/api/workouts/{created['id']}")
    assert delete_response.status_code == 204

    final_list = client.get("/api/workouts")
    assert final_list.status_code == 200
    assert final_list.json() == []


def test_strength_analytics_returns_history_and_recovery_percentage(client) -> None:
    authenticate(client)

    payloads = [
        {
            "date": "2026-04-10",
            "workout_type": "push",
            "duration_minutes": 72,
            "notes": None,
            "exercises": [
                {
                    "exercise_name": "Incline Smith Bench",
                    "exercise_order": 1,
                    "category": "compound",
                    "sets": [
                        {"set_number": 1, "weight": 185, "reps": 8, "rir": 2, "notes": None},
                        {"set_number": 2, "weight": 195, "reps": 6, "rir": 1, "notes": None},
                    ],
                }
            ],
        },
        {
            "date": "2026-04-14",
            "workout_type": "push",
            "duration_minutes": 75,
            "notes": None,
            "exercises": [
                {
                    "exercise_name": "Incline Smith Bench",
                    "exercise_order": 1,
                    "category": "compound",
                    "sets": [
                        {"set_number": 1, "weight": 205, "reps": 5, "rir": 1, "notes": None},
                        {"set_number": 2, "weight": 185, "reps": 8, "rir": 2, "notes": None},
                    ],
                },
                {
                    "exercise_name": "Lat Pulldown",
                    "exercise_order": 2,
                    "category": "compound",
                    "sets": [
                        {"set_number": 1, "weight": 140, "reps": 8, "rir": 2, "notes": None},
                    ],
                },
            ],
        },
    ]

    for payload in payloads:
        response = client.post("/api/workouts", json=payload)
        assert response.status_code == 201

    analytics_response = client.get("/api/analytics/strength")

    assert analytics_response.status_code == 200
    body = analytics_response.json()
    assert len(body["exercises"]) == 2

    incline = next(item for item in body["exercises"] if item["exercise_name"] == "Incline Smith Bench")
    assert incline["reference_estimated_1rm"] == 255.0
    assert isclose(incline["latest_estimated_1rm"], 239.17, abs_tol=0.01)
    assert isclose(incline["best_estimated_1rm"], 239.17, abs_tol=0.01)
    assert isclose(incline["strength_recovery_pct"], 93.79, abs_tol=0.01)
    assert isclose(incline["latest_volume"], 2505.0, abs_tol=0.01)
    assert incline["total_sessions"] == 2
    assert len(incline["history"]) == 2
    assert incline["history"][-1]["date"] == "2026-04-14"

    pulldown = next(item for item in body["exercises"] if item["exercise_name"] == "Lat Pulldown")
    assert isclose(pulldown["reference_estimated_1rm"], 202.67, abs_tol=0.01)
    assert isclose(pulldown["best_estimated_1rm"], 177.33, abs_tol=0.01)
    assert isclose(pulldown["strength_recovery_pct"], 87.5, abs_tol=0.01)
