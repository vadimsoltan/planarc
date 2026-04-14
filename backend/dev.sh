#!/bin/sh
set -eu

export APP_ENV="${APP_ENV:-development}"
export UVICORN_RELOAD=1

exec /bin/sh start.sh
