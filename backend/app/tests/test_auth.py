from __future__ import annotations

from sqlalchemy import func, select

from app.models.auth_session import AuthSession


def test_valid_login_sets_cookie_and_creates_session(client) -> None:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "test-password"})

    assert response.status_code == 204
    assert "planarc_session" in response.cookies

    with client.app.state.session_factory() as session:
        session_count = session.scalar(select(func.count(AuthSession.id)))
        assert session_count == 1


def test_invalid_login_returns_safe_error_message(client) -> None:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "wrong-password"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid credentials"}


def test_auth_me_requires_auth_and_restores_valid_session(client) -> None:
    unauthorized = client.get("/api/auth/me")
    assert unauthorized.status_code == 401

    client.post("/api/auth/login", json={"username": "admin", "password": "test-password"})
    authorized = client.get("/api/auth/me")

    assert authorized.status_code == 200
    assert authorized.json()["username"] == "admin"


def test_logout_revokes_session_and_blocks_reuse(client) -> None:
    client.post("/api/auth/login", json={"username": "admin", "password": "test-password"})

    with client.app.state.session_factory() as session:
        assert session.scalar(select(func.count(AuthSession.id))) == 1

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 204

    with client.app.state.session_factory() as session:
        assert session.scalar(select(func.count(AuthSession.id))) == 0

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 401


def test_profile_and_phase_endpoints_are_protected(client) -> None:
    assert client.get("/api/profile").status_code == 401
    assert client.get("/api/phases").status_code == 401
