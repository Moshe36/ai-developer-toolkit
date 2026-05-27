# PowerShell hook wrapper for post-tool-use-tracker
# Tracks edited files for context management

$ErrorActionPreference = "Stop"

try {
    # Change to GLOBAL hooks directory (dynamic path)
    $claudeHome = Join-Path $env:USERPROFILE ".claude"
    $hooksDir = Join-Path $claudeHome "hooks"
    Set-Location $hooksDir

    # Read stdin and pipe to TypeScript implementation
    $input | npx tsx post-tool-use-tracker.ts

    exit 0
}
catch {
    # Silently exit - tracking is optional
    exit 0
}
