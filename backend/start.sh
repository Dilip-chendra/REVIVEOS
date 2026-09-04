#!/usr/bin/env bash
set -e
PORT="${PORT:-10000}"
echo "--> [ReviveOS] Starting server on 0.0.0.0:${PORT}"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --proxy-headers --forwarded-allow-ips "*"
