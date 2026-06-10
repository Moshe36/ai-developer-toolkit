# setup.ps1
# Creates symlinks from tool config locations to this repo.
# Run once per machine. Re-run to repair broken links.
# Requires Windows Developer Mode (Settings > System > Developer Mode) or admin privileges.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$psv = $PSVersionTable.PSVersion.Major

function Get-ParentPath($path) {
    [System.IO.Path]::GetDirectoryName($path)
}

function Get-LeafName($path) {
    [System.IO.Path]::GetFileName($path)
}

function Get-DevModeEnabled {
    $key = Get-ItemProperty `
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" `
        -ErrorAction SilentlyContinue
    if (-not $key) { return $false }
    if ($psv -ge 6) {
        return $key.PSObject.Properties["AllowDevelopmentWithoutDevLicense"] -and
               $key.AllowDevelopmentWithoutDevLicense -eq 1
    }
    $prop = $key | Get-Member -Name "AllowDevelopmentWithoutDevLicense" -ErrorAction SilentlyContinue
    return $prop -and $key.AllowDevelopmentWithoutDevLicense -eq 1
}

$repo = $PSScriptRoot
$userHome = $env:USERPROFILE

$copilotDir     = "$env:LOCALAPPDATA\github-copilot\intellij"
$vsCodeSettings = "$env:APPDATA\Code\User\settings.json"

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

function Write-Log($level, $message, $detail = $null) {
    $ts = Get-Date -Format "HH:mm:ss"
    $color = switch ($level) {
        "OK"     { "Green"  }
        "SKIP"   { "Yellow" }
        "MKDIR"  { "Cyan"   }
        "BACKUP" { "Yellow" }
        "INFO"   { "Gray"   }
        "ERROR"  { "Red"    }
        default  { "White"  }
    }
    Write-Host "  [$ts] " -NoNewline
    Write-Host ("{0,-6}" -f $level) -ForegroundColor $color -NoNewline
    Write-Host " $message"
    if ($detail) {
        Write-Host "         $detail" -ForegroundColor DarkGray
    }
}

function Test-SymlinkPrivilege {
    $devMode = Get-DevModeEnabled

    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if (-not $devMode -and -not $isAdmin) {
        Write-Log "ERROR" "Symlink creation requires Developer Mode or admin privileges." `
            "Enable via: Settings > System > Developer Mode, or re-run as Administrator."
        Read-Host "`nPress Enter to exit"
        exit 1
    }
}

function Remove-Existing($path) {
    $item = Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
    if (-not $item) { return }
    if ($item.LinkType) {
        Remove-Item -LiteralPath $path -Force
        return
    }
    $backup = "$path.bak"
    Write-Log "BACKUP" (Get-LeafName $path) "-> $backup"
    if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Recurse -Force }
    Rename-Item -LiteralPath $path -NewName "$path.bak"
}

function New-Symlink($link, $target) {
    $parentDir = Get-ParentPath $link
    if (-not (Test-Path -LiteralPath $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
        Write-Log "MKDIR" $parentDir
    }
    New-Item -ItemType SymbolicLink -Path $link -Target $target | Out-Null
}

function Install-RTK($binDir) {
    $rtkExe = "$binDir\rtk.exe"
    $rtkZip = "$env:TEMP\rtk-windows.zip"
    $rtkUrl = "https://github.com/rtk-ai/rtk/releases/latest/download/rtk-x86_64-pc-windows-msvc.zip"

    if (-not (Test-Path -LiteralPath $binDir)) {
        New-Item -ItemType Directory -Path $binDir | Out-Null
    }

    if (Test-Path -LiteralPath $rtkExe) {
        try {
            $version = & $rtkExe --version 2>&1
            Write-Log "SKIP" "RTK already installed" "$version"
            return $rtkExe
        } catch {
            Write-Log "INFO" "rtk.exe exists but failed to run - reinstalling"
        }
    }

    try {
        Write-Log "INFO" "Downloading RTK from GitHub releases..."
        Invoke-WebRequest -Uri $rtkUrl -OutFile $rtkZip -UseBasicParsing
        Expand-Archive -LiteralPath $rtkZip -DestinationPath $binDir -Force
        Remove-Item -LiteralPath $rtkZip -Force
        Write-Log "OK" "RTK installed" $rtkExe
    } catch {
        Write-Log "SKIP" "RTK download failed" "$_"
        Write-Log "INFO" "Install manually: https://github.com/rtk-ai/rtk/releases"
        return $null
    }

    return $rtkExe
}

function Initialize-RTK($rtkExe) {
    if (-not $rtkExe -or -not (Test-Path -LiteralPath $rtkExe)) {
        Write-Log "SKIP" "rtk init (binary not available)"
        return
    }

    & $rtkExe init -g --opencode --auto-patch
    if ($LASTEXITCODE -eq 0) {
        Write-Log "OK" "rtk init -g --opencode"
    } else {
        Write-Log "SKIP" "rtk init failed (exit $LASTEXITCODE)"
        Write-Log "INFO" "Run manually: $rtkExe init -g --opencode"
    }

    & $rtkExe telemetry disable
    if ($LASTEXITCODE -eq 0) {
        Write-Log "OK" "rtk telemetry disabled"
    } else {
        Write-Log "SKIP" "rtk telemetry disable failed (exit $LASTEXITCODE)"
    }
}

function Update-VSCodeSettings($settingsPath, $repo) {
    if (-not (Test-Path -LiteralPath $settingsPath)) {
        Write-Log "SKIP" "VS Code settings.json not found" $settingsPath
        return
    }

    $rawJson = Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8
    $settings = $rawJson | ConvertFrom-Json

    $codeInstructions = @(
        @{ file = "$repo\instructions\SHARED.md" },
        @{ file = "$repo\instructions\VSCODE.md" }
    )
    $commitInstructions = @(
        @{ file = "$repo\instructions\GIT_COMMIT.md" }
    )

    $settings | Add-Member -Force -MemberType NoteProperty `
        -Name "github.copilot.chat.codeGeneration.instructions" -Value $codeInstructions
    $settings | Add-Member -Force -MemberType NoteProperty `
        -Name "github.copilot.chat.commitMessageGeneration.instructions" -Value $commitInstructions

    $settings | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $settingsPath -Encoding UTF8
    Write-Log "OK" "VS Code settings updated"
    Write-Log "INFO" "codeGeneration.instructions        -> SHARED.md + VSCODE.md"
    Write-Log "INFO" "commitMessageGeneration.instructions -> GIT_COMMIT.md"
}

# --- Main ---

Write-Host ""
Write-Host "  ai-developer-toolkit setup" -ForegroundColor Cyan
Write-Host "  Repo: $repo"
Write-Host ""

Test-SymlinkPrivilege

foreach ($entry in $links) {
    $link   = $entry.link
    $target = $entry.target

    if (-not (Test-Path -LiteralPath $target)) {
        Write-Log "SKIP" (Get-LeafName $link) "target missing: $target"
        continue
    }

    Remove-Existing $link
    New-Symlink $link $target
    Write-Log "OK" (Get-LeafName $link) "-> $target"
}

Write-Host ""
Write-Log "INFO" "Configuring VS Code Copilot instructions..."
Update-VSCodeSettings $vsCodeSettings $repo

Write-Host ""
Write-Log "INFO" "Installing RTK (token-saving CLI proxy)..."
$rtkExe = Install-RTK "$repo\bin"
Initialize-RTK $rtkExe

Write-Host ""
Write-Log "INFO" "Done. To update: git pull inside $repo"
Write-Host ""
Read-Host "Press Enter to exit"