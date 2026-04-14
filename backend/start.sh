#!/bin/sh
set -eu

python - <<'PY'
from pathlib import Path
import os

database_url = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")

if database_url.startswith("sqlite:///"):
    db_path = database_url.removeprefix("sqlite:///")
    if db_path and db_path != ":memory:":
        Path(db_path).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)
PY

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
    alembic upgrade head
fi

if [ "${RUN_BOOTSTRAP:-1}" = "1" ]; then
    python -m app.bootstrap
fi

set -- app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-*}"

if [ "${UVICORN_RELOAD:-0}" = "1" ]; then
    set -- "$@" --reload
fi

exec uvicorn "$@"
