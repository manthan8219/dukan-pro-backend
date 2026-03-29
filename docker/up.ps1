$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

docker compose --env-file docker/compose.env -f docker/docker-compose.yml up -d

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Services are up. In your app .env (see also docker/compose.env):" -ForegroundColor Green
Write-Host "  POSTGRES_HOST=localhost"
Write-Host "  POSTGRES_PORT=5432"
Write-Host "  POSTGRES_USER=postgres"
Write-Host "  POSTGRES_PASSWORD=postgres"
Write-Host "  POSTGRES_DB=dukaan"
Write-Host "  MONGODB_URI=mongodb://127.0.0.1:27017/dukaan"
Write-Host "  (Schema: TypeORM auto-syncs entities → DB in dev unless TYPEORM_SYNC=false)"
Write-Host "  OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318"
Write-Host "Jaeger UI: http://localhost:16686"
