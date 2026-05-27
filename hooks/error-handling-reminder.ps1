# PowerShell hook wrapper for error-handling-reminder
# Shows error handling reminders when Claude Code stops

$ErrorActionPreference = "Stop"

try {
    # Change to GLOBAL hooks directory (dynamic path)
    $claudeHome = Join-Path $env:USERPROFILE ".claude"
    $hooksDir = Join-Path $claudeHome "hooks"
    Set-Location $hooksDir

    # Read stdin and pipe to TypeScript implementation
    $input | npx tsx error-handling-reminder.ts

    exit 0
}
catch {
    # Silently exit - reminders are optional
    exit 0
}
