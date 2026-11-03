param(
    [Parameter(Mandatory)][ValidateSet('backend', 'frontend')][string]$Track,
    [Parameter(Mandatory)][string]$Root,
    [string]$ChecksRoot = (Join-Path $env:LOCALAPPDATA 'task-tracker-checks')
)

$ErrorActionPreference = 'Stop'
$taskTrackerDir = $PSScriptRoot
$null = New-Item -ItemType Directory -Force $Root
$rootPath = (Resolve-Path $Root).Path
$repoPath = Join-Path $rootPath "task-tracker-$Track"
$null = New-Item -ItemType Directory -Force $ChecksRoot
$checksPath = Join-Path (Resolve-Path $ChecksRoot).Path $Track

if ((Test-Path $repoPath) -or (Test-Path $checksPath)) {
    throw "Workspace already exists under $rootPath for track '$Track'. Remove it first."
}

function Invoke-Native {
    param([scriptblock]$Command)
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $Command" }
}

function Copy-StartingApp {
    $excluded = @('node_modules', 'target', 'dist')
    $null = New-Item -ItemType Directory $repoPath
    Get-ChildItem (Join-Path $taskTrackerDir $Track) -Force |
        Where-Object { $_.Name -notin $excluded } |
        Copy-Item -Destination $repoPath -Recurse -Force
}

function Set-LocalGitIdentityIfMissing {
    if (-not (git config --global user.name)) { git config user.name 'Workshop' }
    if (-not (git config --global user.email)) { git config user.email 'workshop@example.com' }
}

function Initialize-Repository {
    Push-Location $repoPath
    try {
        Invoke-Native { git init -q }
        Set-LocalGitIdentityIfMissing
        Invoke-Native { git add -A }
        Invoke-Native { git commit -q -m 'Starting point' }
        Invoke-Native { git tag ex-start }
    }
    finally { Pop-Location }
}

function Copy-HiddenChecks {
    Copy-Item (Join-Path $taskTrackerDir "checks\$Track") $checksPath -Recurse
}

function Install-Dependencies {
    Push-Location $repoPath
    try {
        if ($Track -eq 'frontend') { Invoke-Native { npm install --no-audit --no-fund } }
        else { Invoke-Native { mvn -q -DskipTests compile } }
    }
    finally { Pop-Location }
}

Copy-StartingApp
Initialize-Repository
Copy-HiddenChecks
Install-Dependencies

Write-Host ''
Write-Host "Workspace ready: $repoPath"
Write-Host "Checks (outside the repo, facilitator only): $checksPath"
Write-Host "Reset:  cd $repoPath; git checkout -f ex-start; git clean -fd"
Write-Host "Verify: & $checksPath\verify.ps1 -Repo $repoPath"
