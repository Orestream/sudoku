param(
	[string]$Service = 'db',
	[int]$TimeoutSeconds = 60
)

$ErrorActionPreference = 'Stop'

$containerId = (docker compose ps -q $Service).Trim()
if (-not $containerId) {
	throw "No container found for docker compose service '$Service'."
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ($true) {
	$status = (docker inspect -f '{{.State.Health.Status}}' $containerId 2>$null).Trim()
	if ($status -eq 'healthy') {
		Write-Host "Postgres is healthy."
		exit 0
	}

	if ((Get-Date) -gt $deadline) {
		throw "Timed out waiting for Postgres health status. Last status: '$status'"
	}

	Start-Sleep -Seconds 2
}

