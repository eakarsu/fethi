#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -a
source "$project_dir/.env"
set +a
mode="${1:-start}"

case "$mode" in
  check)
    npm --prefix "$project_dir/backend" test
    npm --prefix "$project_dir/frontend" run build
    exit
    ;;
  migrate)
    npm --prefix "$project_dir/backend" run migrate
    exit
    ;;
  start) ;;
  *) echo 'usage: ./start.sh check|migrate|start' >&2; exit 2 ;;
esac

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is required}"
: "${OPENROUTER_MODEL:?OPENROUTER_MODEL is required}"
: "${OPENROUTER_BASE_URL:?OPENROUTER_BASE_URL is required}"
api_port="${BACKEND_PORT:?BACKEND_PORT is required}"
ui_port="${FRONTEND_PORT:?FRONTEND_PORT is required}"
[[ "$api_port" != "$ui_port" ]] || { echo 'BACKEND_PORT and FRONTEND_PORT must differ' >&2; exit 1; }
for port in "$api_port" "$ui_port"; do
  ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || { echo "Port $port is occupied" >&2; exit 1; }
done

export BACKEND_HOST=127.0.0.1 CORS_ORIGINS="http://127.0.0.1:$ui_port"
export VITE_BACKEND_URL="http://127.0.0.1:$api_port"
npm --prefix "$project_dir/backend" run migrate
npm --prefix "$project_dir/backend" run create-admin

cleanup() {
  trap - INT TERM EXIT
  [[ -z "${ui_pid:-}" ]] || kill "$ui_pid" 2>/dev/null || true
  [[ -z "${api_pid:-}" ]] || kill "$api_pid" 2>/dev/null || true
  [[ -z "${ui_pid:-}" ]] || wait "$ui_pid" 2>/dev/null || true
  [[ -z "${api_pid:-}" ]] || wait "$api_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

(cd "$project_dir/backend" && exec node server.js) &
api_pid=$!
for ((attempt=0; attempt<120; attempt++)); do
  curl -fsS "http://127.0.0.1:$api_port/api/health" >/dev/null 2>&1 && break
  kill -0 "$api_pid" 2>/dev/null || { wait "$api_pid"; exit $?; }
  sleep 0.5
done
curl -fsS "http://127.0.0.1:$api_port/api/health" >/dev/null
(cd "$project_dir/frontend" && exec ./node_modules/.bin/vite --host 127.0.0.1 --port "$ui_port") &
ui_pid=$!
wait "$api_pid" "$ui_pid"
