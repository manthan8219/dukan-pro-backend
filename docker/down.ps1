$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

docker compose --env-file docker/compose.env -f docker/docker-compose.yml down

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Stack stopped. Add -v to docker compose down to remove volumes (wipes DB data)." -ForegroundColor Yellow
