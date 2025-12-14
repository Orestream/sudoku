$ErrorActionPreference = 'Stop'

powershell -NoProfile -ExecutionPolicy Bypass -File scripts/wait-for-db.ps1 | Out-Host

if (-not $env:DATABASE_URL) {
	$env:DATABASE_URL = 'postgres://sudoku:sudoku@localhost:5432/sudoku?sslmode=disable'
}

if (-not $env:API_ADDR) {
	$env:API_ADDR = ':8080'
}

$backendCommand = @('go', 'run', './cmd/api')
if (Get-Command gow -ErrorAction SilentlyContinue) {
	$backendCommand = @('gow', '-c', 'run', './cmd/api')
}

$backendProcess = $null
$frontendProcess = $null

try {
	Write-Host 'Starting backend...'
	$backendProcess = Start-Process -FilePath $backendCommand[0] -ArgumentList $backendCommand[1..($backendCommand.Length - 1)] -WorkingDirectory 'backend' -PassThru

	Write-Host 'Starting frontend...'
	$frontendProcess = Start-Process -FilePath 'bun' -ArgumentList @('run', 'dev', '--', '--host', '0.0.0.0', '--port', '5173') -WorkingDirectory 'frontend' -PassThru

	Write-Host 'Dev servers running:'
	Write-Host '  Frontend: http://localhost:5173'
	Write-Host '  Backend:  http://localhost:8080'
	Write-Host 'Press Ctrl+C to stop.'

	Wait-Process -Id @($backendProcess.Id, $frontendProcess.Id)
} finally {
	foreach ($p in @($frontendProcess, $backendProcess)) {
		if ($null -ne $p -and -not $p.HasExited) {
			try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}
		}
	}
}

