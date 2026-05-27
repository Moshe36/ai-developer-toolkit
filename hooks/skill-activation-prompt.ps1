# PowerShell hook wrapper for skill-activation-prompt
# Reads stdin and pipes to TypeScript implementation
# Uses GLOBAL hooks from $env:USERPROFILE\.claude\hooks (dynamic path)

$ErrorActionPreference = "Stop"

try {
    # Change to GLOBAL hooks directory (dynamic path)
    $claudeHome = Join-Path $env:USERPROFILE ".claude"
    $hooksDir = Join-Path $claudeHome "hooks"
    Set-Location $hooksDir

    # Read stdin and pipe to TypeScript
    $input | npx tsx skill-activation-prompt.ts

    exit 0
}
catch {
    Write-Error "Error in skill-activation-prompt hook: $_"
    exit 1
}
