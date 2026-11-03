param([Parameter(Mandatory)][string]$Repo)

$ErrorActionPreference = 'Stop'
$totalChecks = 7
$repoPath = (Resolve-Path $Repo).Path
$hiddenDir = Join-Path $repoPath 'src\__hidden__'
$jsonOutput = Join-Path ([IO.Path]::GetTempPath()) "hidden-checks-$([guid]::NewGuid()).json"

$passed = 0
$couldNotRun = $true
$existing = 'FAIL'
$previousEncoding = [Console]::OutputEncoding
$previousRepoEnv = $env:REPO
[Console]::OutputEncoding = [Text.Encoding]::UTF8

try {
    New-Item -ItemType Directory -Force -Path $hiddenDir | Out-Null
    Copy-Item (Join-Path $PSScriptRoot 'hidden.check.tsx') $hiddenDir -Force
    Copy-Item (Join-Path $PSScriptRoot 'vitest.checks.config.ts') $hiddenDir -Force
    $env:REPO = $repoPath

    Push-Location $repoPath
    try {
        & npx vitest run --config (Join-Path $hiddenDir 'vitest.checks.config.ts') --reporter=json "--outputFile=$jsonOutput" *> $null

        if (Test-Path $jsonOutput) {
            $report = Get-Content $jsonOutput -Raw | ConvertFrom-Json
            $assertions = @($report.testResults | ForEach-Object { $_.assertionResults })
            $passed = @($assertions | Where-Object { $_.status -eq 'passed' }).Count
            if ($assertions.Count -gt 0) { $couldNotRun = $false }
        }

        & npm test -- --run *> $null
        if ($LASTEXITCODE -eq 0) { $existing = 'PASS' }
    } finally {
        Pop-Location
    }
} catch {
    $passed = 0
    $existing = 'FAIL'
} finally {
    if (Test-Path $hiddenDir) { Remove-Item $hiddenDir -Recurse -Force }
    if (Test-Path $jsonOutput) { Remove-Item $jsonOutput -Force }
    $env:REPO = $previousRepoEnv
}

$dot = [char]0x00B7
if ($couldNotRun) {
    Write-Output "Hidden checks: could not run (app structure changed - see facilitator) $dot Existing tests: $existing"
} else {
    Write-Output "Hidden checks: $passed / $totalChecks passed $dot Existing tests: $existing"
}
[Console]::OutputEncoding = $previousEncoding
exit 0
