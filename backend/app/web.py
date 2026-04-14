from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from app.core.config import Settings


def register_frontend_routes(app: FastAPI, settings: Settings) -> None:
    if not settings.frontend_dist_dir:
        return

    dist_dir = Path(settings.frontend_dist_dir).expanduser().resolve()
    index_path = dist_dir / "index.html"
    if not index_path.is_file():
        return

    @app.get("/", include_in_schema=False)
    async def serve_frontend_root() -> FileResponse:
        return FileResponse(index_path)

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend_app(full_path: str) -> FileResponse:
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="Not found")

        candidate = (dist_dir / full_path).resolve()
        if candidate.is_file() and candidate.is_relative_to(dist_dir):
            return FileResponse(candidate)

        return FileResponse(index_path)
