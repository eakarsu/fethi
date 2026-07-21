#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "${SKIP_PROJECT_ENV:-false}" != "true" && -f "$PROJECT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env"
  set +a
fi

BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"

if [[ -z "${JWT_SECRET:-}" || ${#JWT_SECRET} -lt 32 ]]; then
  echo "JWT_SECRET must be configured with at least 32 characters." >&2
  exit 1
fi

if [[ "${INSTALL_DEPENDENCIES:-0}" == "1" ]]; then
  npm ci --prefix "$PROJECT_DIR/backend"
  npm ci --prefix "$PROJECT_DIR/frontend"
fi

for dependency_dir in "$PROJECT_DIR/backend/node_modules" "$PROJECT_DIR/frontend/node_modules"; do
  [[ -d "$dependency_dir" ]] || { echo "Dependencies are missing at $dependency_dir; run an explicit bootstrap step." >&2; exit 1; }
done

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is occupied; refusing to terminate another process." >&2
    exit 1
  fi
done

if [[ "${RUN_MIGRATIONS:-0}" == "1" ]]; then
  npm run migrate --prefix "$PROJECT_DIR/backend"
else
  echo "Migrations were not run. Use RUN_MIGRATIONS=1 after reviewing the target DATABASE_URL."
fi

(cd "$PROJECT_DIR/backend" && exec env BACKEND_HOST="$BACKEND_HOST" BACKEND_PORT="$BACKEND_PORT" node server.js) &
backend_pid=$!
(cd "$PROJECT_DIR/frontend" && exec ./node_modules/.bin/vite --host "$FRONTEND_HOST" --port "$FRONTEND_PORT") &
frontend_pid=$!

cleanup() {
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Frontend: http://$FRONTEND_HOST:$FRONTEND_PORT"
echo "Backend:  http://$BACKEND_HOST:$BACKEND_PORT"
wait
