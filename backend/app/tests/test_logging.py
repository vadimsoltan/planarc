from __future__ import annotations

from math import isclose


def authenticate(client) -> None:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "test-password"})
    assert response.status_code == 204


def test_daily_log_crud_and_date_uniqueness(client) -> None:
    authenticate(client)

    create_response = client.post(
        "/api/daily-logs",
        json={
            "date": "2026-04-11",
            "weight_kg": 95.1,
            "calories": 2210,
            "protein_g": 205,
            "carbs_g": 180,
            "fat_g": 61,
            "steps": 9300,
            "cardio_minutes": 20,
            "cardio_type": "Incline walk",
            "sleep_hours": 7.5,
            "is_training_day": True,
            "notes": "Strong first day.",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["weight_kg"] == 95.1
    assert created["is_training_day"] is True

    duplicate_response = client.post("/api/daily-logs", json={"date": "2026-04-11", "weight_kg": 95.0})
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "A daily log already exists for that date"}

    list_response = client.get("/api/daily-logs")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    update_response = client.put(
        f"/api/daily-logs/{created['id']}",
        json={
            "date": "2026-04-12",
            "weight_kg": 94.7,
            "calories": 2150,
            "protein_g": 210,
            "carbs_g": 175,
            "fat_g": 58,
            "steps": 10050,
            "cardio_minutes": 10,
            "cardio_type": "Bike",
            "sleep_hours": 8,
            "is_training_day": False,
            "notes": "Shifted to recovery day.",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["date"] == "2026-04-12"
    assert updated["is_training_day"] is False

    filtered = client.get("/api/daily-logs", params={"start_date": "2026-04-12", "end_date": "2026-04-12"})
    assert filtered.status_code == 200
    assert len(filtered.json()) == 1

    delete_response = client.delete(f"/api/daily-logs/{created['id']}")
    assert delete_response.status_code == 204

    final_list = client.get("/api/daily-logs")
    assert final_list.status_code == 200
    assert final_list.json() == []


def test_measurement_crud_and_derived_metrics(client) -> None:
    authenticate(client)

    daily_log_response = client.post(
        "/api/daily-logs",
        json={"date": "2026-04-10", "weight_kg": 94.0, "calories": 2200, "is_training_day": True},
    )
    assert daily_log_response.status_code == 201

    create_response = client.post(
        "/api/measurements",
        json={
            "date": "2026-04-11",
            "neck_cm": 36.5,
            "waist_navel_cm": 94,
            "waist_narrow_cm": 86,
            "chest_cm": 102,
            "hips_cm": 92,
            "glutes_cm": 104.6,
            "arm_relaxed_cm": 31,
            "arm_flexed_cm": 35,
            "thigh_mid_cm": 54,
            "thigh_upper_cm": 59,
            "calf_cm": 38.5,
            "notes": "Baseline check-in.",
        },
    )

    assert create_response.status_code == 201
    measurement = create_response.json()
    assert isclose(measurement["navy_body_fat_pct"], 21.25, abs_tol=0.01)
    assert isclose(measurement["adjusted_body_fat_pct"], 21.25, abs_tol=0.01)
    assert isclose(measurement["lean_mass_kg"], 74.02, abs_tol=0.01)
    assert isclose(measurement["fat_mass_kg"], 19.97, abs_tol=0.01)
    assert isclose(measurement["waist_height_ratio"], 0.4821, abs_tol=0.0001)
    assert isclose(measurement["chest_waist_ratio"], 1.0851, abs_tol=0.0001)

    update_response = client.put(
        f"/api/measurements/{measurement['id']}",
        json={
            "date": "2026-04-12",
            "neck_cm": 36.5,
            "waist_navel_cm": 93,
            "waist_narrow_cm": 85,
            "chest_cm": 102,
            "hips_cm": 92,
            "glutes_cm": 104.6,
            "arm_relaxed_cm": 31,
            "arm_flexed_cm": 35,
            "thigh_mid_cm": 54,
            "thigh_upper_cm": 59,
            "calf_cm": 38.5,
            "adjusted_body_fat_pct": 18.5,
            "notes": "Manual override for visual estimate.",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert isclose(updated["navy_body_fat_pct"], 20.59, abs_tol=0.01)
    assert isclose(updated["adjusted_body_fat_pct"], 18.5, abs_tol=0.01)
    assert isclose(updated["lean_mass_kg"], 76.61, abs_tol=0.01)
    assert isclose(updated["fat_mass_kg"], 17.39, abs_tol=0.01)

    list_response = client.get("/api/measurements")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    delete_response = client.delete(f"/api/measurements/{measurement['id']}")
    assert delete_response.status_code == 204
    assert client.get("/api/measurements").json() == []


def test_measurement_without_reference_weight_stores_null_mass_values(client) -> None:
    authenticate(client)

    response = client.post(
        "/api/measurements",
        json={
            "date": "2026-04-11",
            "neck_cm": 36.5,
            "waist_navel_cm": 94,
            "chest_cm": 102,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["navy_body_fat_pct"] is not None
    assert body["lean_mass_kg"] is None
    assert body["fat_mass_kg"] is None
