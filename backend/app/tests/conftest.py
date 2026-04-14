from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401
from app.core.config import Settings
from app.db.base import Base
from app.main import create_app
from app.services.seed_service import bootstrap_if_needed


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    db_path = tmp_path / "test.db"
    return Settings(
        app_env="test",
        secret_key="test-secret",
        database_url=f"sqlite:///{db_path}",
        admin_username="admin",
        admin_password="test-password",
        session_ttl_hours=24,
    )


@pytest.fixture
def client(settings: Settings) -> TestClient:
    engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    with session_factory() as session:
        bootstrap_if_needed(session, settings)

    app = create_app(settings)
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        engine.dispose()
