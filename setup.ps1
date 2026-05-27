# setup.ps1
# Creates symlinks from tool config locations to this repo.
# Run once per machine. Re-run to repair broken links.
# Requires Windows Developer Mode (Settings > System > Developer Mode).

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repo = $PSScriptRoot
$userHome = $env:USERPROFILE

$copilotDir = "$env:LOCALAPPDATA\github-copilot\intellij"

$links = @(
    # Claude Code + OpenCode (reads ~/.claude as fallback)
    @{ link = "$userHome\.claude\CLAUDE.md";          target = "$repo\instructions\CLAUDE.md";                    type = "file" },
    @{ link = "$userHome\.claude\skills";             target = "$repo\skills";                                    type = "dir"  },
    @{ link = "$userHome\.claude\agents";             target = "$repo\agents";                                    type = "dir"  },
    @{ link = "$userHome\.claude\commands";           target = "$repo\commands";                                  type = "dir"  },
    @{ link = "$userHome\.claude\hooks";              target = "$repo\hooks";                                     type = "dir"  },
    # OpenCode global rules
    @{ link = "$userHome\.config\opencode\AGENTS.md"; target = "$repo\instructions\SHARED.md";                    type = "file" },
    # Codex CLI global rules
    @{ link = "$userHome\.codex\AGENTS.md";           target = "$repo\instructions\SHARED.md";                    type = "file" },
    # Copilot IntelliJ
    @{ link = "$copilotDir\global-copilot-instructions.md";    target = "$repo\instructions\COPILOT.md";          type = "file" },
    @{ link = "$copilotDir\global-agents-instructions.md";     target = "$repo\instructions\SHARED.md";           type = "file" },
    @{ link = "$copilotDir\global-git-commit-instructions.md"; target = "$repo\instructions\GIT_COMMIT.md";       type = "file" }
)

function Remove-Existing($path) {
    $item = Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
    if (-not $item) { return }
    if ($item.LinkType) {
        Remove-Item -LiteralPath $path -Force
        return
    }
    # Real file or directory — back it up instead of deleting
    $backup = "$path.bak"
    Write-Host "  backing up $path -> $backup"
    if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Recurse -Force }
    Rename-Item -LiteralPath $path -NewName "$path.bak"
}

Write-Host ""
Write-Host "Setting up ai-developer-toolkit symlinks..."
Write-Host "Repo: $repo"
Write-Host ""

foreach ($entry in $links) {
    $link   = $entry.link
    $target = $entry.target
    $type   = $entry.type

    # Verify target exists in repo
    if (-not (Test-Path -LiteralPath $target)) {
        Write-Host "  SKIP  $link  (target missing: $target)"
        continue
    }

    # Remove or back up existing
    Remove-Existing $link

    # Create symlink
    New-Item -ItemType SymbolicLink -Path $link -Target $target | Out-Null
    Write-Host "  OK    $link"
    Write-Host "        -> $target"
}

Write-Host ""
Write-Host "Done. All tools now read directly from the repo."
Write-Host "To update: git pull inside $repo"
Write-Host ""
