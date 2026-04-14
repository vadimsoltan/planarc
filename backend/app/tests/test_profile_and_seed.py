from __future__ import annotations

from sqlalchemy import func, select

from app.models.exercise_reference_pr import ExerciseReferencePR
from app.models.goal import Goal
from app.models.phase import Phase
from app.models.profile import Profile
from app.models.user import User
from app.services.seed_service import bootstrap_if_needed


def authenticate(client) -> None:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "test-password"})
    assert response.status_code == 204


def test_seed_bootstrap_creates_expected_records_and_is_idempotent(client) -> None:
    with client.app.state.session_factory() as session:
        assert session.scalar(select(func.count(User.id))) == 1
        assert session.scalar(select(func.count(Profile.id))) == 1
        assert session.scalar(select(func.count(Phase.id))) == 3
        assert session.scalar(select(func.count(Goal.id))) == 6
        assert session.scalar(select(func.count(ExerciseReferencePR.id))) == 13

        created = bootstrap_if_needed(session, client.app.state.settings)
        assert created is False
        assert session.scalar(select(func.count(User.id))) == 1
        assert session.scalar(select(func.count(Profile.id))) == 1
        assert session.scalar(select(func.count(Phase.id))) == 3


def test_profile_update_persists(client) -> None:
    authenticate(client)

    response = client.put(
        "/api/profile",
        json={
            "height_cm": 195,
            "age": 30,
            "sex": "male",
            "start_weight_kg": 94.2,
            "current_goal_weight_kg": 86.5,
            "adjusted_body_fat_current": 20.5,
            "default_training_days_per_week": 4,
            "default_step_target": 9500,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["age"] == 30
    assert body["default_step_target"] == 9500

    follow_up = client.get("/api/profile")
    assert follow_up.status_code == 200
    assert follow_up.json()["current_goal_weight_kg"] == 86.5


def test_get_phases_returns_seeded_active_phase(client) -> None:
    authenticate(client)

    response = client.get("/api/phases")

    assert response.status_code == 200
    phases = response.json()
    active = [phase for phase in phases if phase["is_active"]]
    assert len(phases) == 3
    assert len(active) == 1
    assert active[0]["name"] == "Aggressive Recomp"
