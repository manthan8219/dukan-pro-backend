#!/usr/bin/env sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

docker compose --env-file docker/compose.env -f docker/docker-compose.yml down

echo "Stack stopped. Use 'docker compose ... down -v' to remove volumes (wipes DB data)."
