from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "WTA Fitness Tracker"
    app_env: str = "development"
    secret_key: str = "replace-with-a-long-random-string"
    database_url: str = "sqlite:///./data/app.db"
    admin_username: str = "admin"
    admin_password: str = "change-me-now"
    session_ttl_hours: int = 168
    session_cookie_name: str = "wta_session"
    frontend_dist_dir: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cookie_secure(self) -> bool:
        return self.app_env.lower() not in {"development", "test"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
