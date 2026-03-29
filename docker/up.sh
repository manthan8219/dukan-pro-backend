#!/usr/bin/env sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

docker compose --env-file docker/compose.env -f docker/docker-compose.yml up -d

echo ""
echo "Services are up. Point your app .env at:"
echo "  POSTGRES_HOST=localhost  POSTGRES_PORT=5432  (see docker/compose.env)"
echo "  MONGODB_URI=mongodb://127.0.0.1:27017/dukaan"
echo "  (Schema: TypeORM auto-syncs entities → DB in dev unless TYPEORM_SYNC=false)"
echo "  OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318"
echo "Jaeger UI: http://localhost:16686"
