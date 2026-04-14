from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_frontend_build_is_served_from_backend(tmp_path: Path) -> None:
    dist_dir = tmp_path / "dist"
    assets_dir = dist_dir / "assets"
    assets_dir.mkdir(parents=True)
    index_path = dist_dir / "index.html"
    asset_path = assets_dir / "app.js"
    index_path.write_text("<!doctype html><html><body><div id='root'>Single origin app</div></body></html>", encoding="utf-8")
    asset_path.write_text("console.log('hello');", encoding="utf-8")

    settings = Settings(
        app_env="test",
        secret_key="test-secret",
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        admin_username="admin",
        admin_password="test-password",
        frontend_dist_dir=str(dist_dir),
    )

    app = create_app(settings)

    with TestClient(app) as client:
        root_response = client.get("/")
        plan_response = client.get("/plan")
        asset_response = client.get("/assets/app.js")
        api_response = client.get("/api/not-real")

    assert root_response.status_code == 200
    assert "Single origin app" in root_response.text
    assert plan_response.status_code == 200
    assert plan_response.text == root_response.text
    assert asset_response.status_code == 200
    assert "console.log('hello');" in asset_response.text
    assert api_response.status_code == 404
