#!/usr/bin/env bash
set -euo pipefail

service="${1:-db}"
timeout_seconds="${2:-60}"

container_id="$(docker compose ps -q "$service" | tr -d '\r' | tr -d '\n')"
if [[ -z "${container_id}" ]]; then
  echo "No container found for docker compose service '${service}'." >&2
  exit 1
fi

deadline="$(( $(date +%s) + timeout_seconds ))"
while true; do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$container_id" 2>/dev/null | tr -d '\r' | tr -d '\n' || true)"
  if [[ "$status" == "healthy" ]]; then
    echo "Postgres is healthy."
    exit 0
  fi

  if (( $(date +%s) > deadline )); then
    echo "Timed out waiting for Postgres health status. Last status: '${status}'" >&2
    exit 1
  fi

  sleep 2
done

