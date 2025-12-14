#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root_dir="$(cd "${script_dir}/.." && pwd)"

: "${DATABASE_URL:=postgres://sudoku:sudoku@localhost:5432/sudoku?sslmode=disable}"
: "${API_ADDR:=:8080}"
export DATABASE_URL API_ADDR

backend_cmd=(go run ./cmd/api)
if command -v gow >/dev/null 2>&1; then
  backend_cmd=(gow -c run ./cmd/api)
fi

backend_pid=""
frontend_pid=""
cleaned_up="0"

cleanup() {
  if [[ "${cleaned_up}" == "1" ]]; then
    return 0
  fi
  cleaned_up="1"

  set +e
  for pid in "${frontend_pid}" "${backend_pid}"; do
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      kill -TERM -- "-${pid}" 2>/dev/null || true
    fi
  done

  sleep 1

  for pid in "${frontend_pid}" "${backend_pid}"; do
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      kill -KILL -- "-${pid}" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

echo "Starting backend..."
(setsid bash -lc "cd \"${root_dir}/backend\" && exec ${backend_cmd[*]}") &
backend_pid="$!"

echo "Starting frontend..."
(setsid bash -lc "cd \"${root_dir}/frontend\" && exec bun run dev -- --host 0.0.0.0 --port 5173") &
frontend_pid="$!"

echo "Dev servers running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8080"
echo "Press Ctrl+C to stop."

wait -n "${backend_pid}" "${frontend_pid}"
