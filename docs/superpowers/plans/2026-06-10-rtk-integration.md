# RTK Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate RTK (token-saving CLI proxy) into the ai-developer-toolkit so that `setup.ps1` installs the RTK binary, wires the OpenCode plugin, injects usage instructions into CLAUDE.md, and updates the README — all from one command.

**Architecture:** `setup.ps1` gains an RTK installation block that downloads the Windows binary, places it in `~/.local/bin`, runs `rtk init -g --opencode` to install the OpenCode plugin and inject instructions, and falls back gracefully if RTK is already present. The existing symlink logic is unchanged.

**Tech Stack:** PowerShell 7+, RTK v0.42.3 (Windows x64 binary), RTK OpenCode plugin (TypeScript, installed by RTK itself)

---

## File Map

| File | Change |
|---|---|
| `setup.ps1` | Add RTK install + init block after existing symlinks |
| `README.md` | Add RTK row to "What gets wired up" table; note Windows limitation |

---

### Task 1: Add RTK binary installation to setup.ps1

**Files:**
- Modify: `setup.ps1`

RTK binary URL pattern: `https://github.com/rtk-ai/rtk/releases/latest/download/rtk-x86_64-pc-windows-msvc.zip`

The latest release redirect resolves to the versioned asset. PowerShell's `Invoke-WebRequest` follows redirects automatically.

Install target: `$env:USERPROFILE\.local\bin\rtk.exe` — consistent with the recommended location from RTK docs and already used by WSL users.

- [ ] **Step 1: Read the current setup.ps1 in full**

```powershell
Get-Content -LiteralPath "C:\Users\moshemoa\ai-developer-toolkit\setup.ps1"
```

- [ ] **Step 2: Add the RTK install block to setup.ps1**

Add this block immediately before the final `Write-Host "Done."` lines (after the VS Code settings block):

```powershell
Write-Host ""
Write-Host "Installing RTK (token-saving CLI proxy)..."

$rtkInstallDir = "$userHome\.local\bin"
$rtkExe        = "$rtkInstallDir\rtk.exe"
$rtkZip        = "$env:TEMP\rtk-windows.zip"
$rtkUrl        = "https://github.com/rtk-ai/rtk/releases/latest/download/rtk-x86_64-pc-windows-msvc.zip"

# Ensure install dir exists
if (-not (Test-Path -LiteralPath $rtkInstallDir)) {
    New-Item -ItemType Directory -Path $rtkInstallDir | Out-Null
}

# Check if already installed and up to date
$shouldInstall = $true
if (Test-Path -LiteralPath $rtkExe) {
    try {
        $installedVersion = & $rtkExe --version 2>&1
        Write-Host "  FOUND rtk already installed: $installedVersion"
        $shouldInstall = $false
    } catch {
        Write-Host "  rtk.exe exists but failed to run — reinstalling"
    }
}

if ($shouldInstall) {
    try {
        Write-Host "  Downloading RTK from GitHub releases..."
        Invoke-WebRequest -Uri $rtkUrl -OutFile $rtkZip -UseBasicParsing
        Expand-Archive -LiteralPath $rtkZip -DestinationPath $rtkInstallDir -Force
        Remove-Item -LiteralPath $rtkZip -Force
        Write-Host "  OK    $rtkExe"
    } catch {
        Write-Host "  SKIP  RTK download failed: $_"
        Write-Host "        Install manually: https://github.com/rtk-ai/rtk/releases"
    }
}
```

- [ ] **Step 3: Verify the edit looks correct**

```powershell
Get-Content -LiteralPath "C:\Users\moshemoa\ai-developer-toolkit\setup.ps1"
```

Confirm the RTK block appears before the final `Write-Host "Done."` lines and is syntactically valid (balanced braces, no missing variables).

---

### Task 2: Add RTK OpenCode plugin init to setup.ps1

**Files:**
- Modify: `setup.ps1`

`rtk init -g --opencode` installs the OpenCode plugin (TypeScript) to OpenCode's plugin directory and injects RTK.md instructions into CLAUDE.md. On Windows native it falls back to CLAUDE.md injection mode automatically. The `--auto-patch` flag makes it non-interactive.

- [ ] **Step 1: Add rtk init block immediately after the RTK install block**

Add this after the `$shouldInstall` / `if ($shouldInstall)` block, still within the RTK section:

```powershell
# Wire RTK into OpenCode and Claude Code
if (Test-Path -LiteralPath $rtkExe) {
    Write-Host "  Wiring RTK into OpenCode and Claude Code..."
    try {
        & $rtkExe init -g --opencode --auto-patch 2>&1 | ForEach-Object { Write-Host "    $_" }
        Write-Host "  OK    rtk init -g --opencode"
    } catch {
        Write-Host "  WARN  rtk init failed: $_"
        Write-Host "        Run manually: rtk init -g --opencode"
    }
} else {
    Write-Host "  SKIP  rtk init (binary not found — install RTK first)"
}
```

- [ ] **Step 2: Verify the full RTK section reads correctly**

```powershell
Get-Content -LiteralPath "C:\Users\moshemoa\ai-developer-toolkit\setup.ps1"
```

The order within the RTK section must be:
1. Create install dir if missing
2. Check/install binary
3. Run `rtk init -g --opencode --auto-patch`

---

### Task 3: Verify setup.ps1 runs cleanly

**Files:**
- No changes — verification only

- [ ] **Step 1: Run setup.ps1 in dry observation mode**

```powershell
& "C:\Users\moshemoa\ai-developer-toolkit\setup.ps1"
```

Expected output includes:
- All existing symlink lines (`OK  C:\Users\...\CLAUDE.md`)
- VS Code settings line
- `Installing RTK (token-saving CLI proxy)...`
- Either `FOUND rtk already installed: rtk X.Y.Z` (if previously installed) or download progress
- `OK    rtk init -g --opencode` or a `WARN` with instructions

If any `SKIP` or `WARN` lines appear for the existing symlinks, that is a pre-existing issue unrelated to this change.

- [ ] **Step 2: Confirm rtk.exe is reachable**

```powershell
& "$env:USERPROFILE\.local\bin\rtk.exe" --version
```

Expected: `rtk X.Y.Z`

- [ ] **Step 3: Confirm rtk gain runs**

```powershell
& "$env:USERPROFILE\.local\bin\rtk.exe" gain
```

Expected: token savings stats (may show zeros on first run — that is correct).

- [ ] **Step 4: Confirm OpenCode plugin was installed**

```powershell
Get-ChildItem -Path "$env:USERPROFILE\.config\opencode\plugins" -ErrorAction SilentlyContinue
```

Expected: a directory or file related to `rtk` (exact name depends on RTK plugin implementation). If `plugins` directory doesn't exist, `rtk init --opencode` may store the plugin elsewhere — check RTK's output from Task 2.

---

### Task 4: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read README.md**

```powershell
Get-Content -LiteralPath "C:\Users\moshemoa\ai-developer-toolkit\README.md"
```

- [ ] **Step 2: Add RTK row to the "What gets wired up" table**

Find this table in README.md:

```markdown
| Tool | File/folder linked |
|---|---|
| **Claude Code** | `~/.claude/CLAUDE.md`, `skills/`, `agents/`, `commands/`, `hooks/` |
```

Add RTK as a new row at the bottom of that table:

```markdown
| **RTK** | `~/.local/bin/rtk.exe` installed; OpenCode plugin wired via `rtk init -g --opencode` |
```

- [ ] **Step 3: Add a Windows limitation note below the table**

After the table closing line, add:

```markdown
> **Windows note:** RTK's auto-rewrite hook requires a Unix shell and does not run on Windows native.
> `setup.ps1` installs the binary and wires the OpenCode plugin (CLAUDE.md injection mode).
> For full hook-based rewriting, use WSL.
```

- [ ] **Step 4: Verify README renders correctly**

```powershell
Get-Content -LiteralPath "C:\Users\moshemoa\ai-developer-toolkit\README.md"
```

Confirm the table still has correct `|---|---|` alignment and the note appears directly after the table.

---

### Task 5: Smoke-test RTK against a real command

**Files:**
- No changes — verification only

- [ ] **Step 1: Test rtk git status**

```powershell
& "$env:USERPROFILE\.local\bin\rtk.exe" git status
```

Run from inside the ai-developer-toolkit repo directory. Expected: compact git status output (no "On branch..." verbosity, just file counts or clean state).

- [ ] **Step 2: Test rtk ls**

```powershell
& "$env:USERPROFILE\.local\bin\rtk.exe" ls .
```

Expected: token-optimized directory tree (indented structure, not raw `ls -la` table).

If both commands produce compact output, RTK is working correctly. Token savings will accumulate automatically once the AI uses `rtk`-prefixed commands per the injected instructions.

---

## PATH note

`~/.local/bin` must be in `$PATH` for the AI tools and terminal sessions to resolve `rtk` without the full path. `setup.ps1` does **not** modify PATH — this is intentional (PATH modification requires restarting the shell and is user-preference territory). After running `setup.ps1`, add this line to your PowerShell profile if not already present:

```powershell
$env:PATH += ";$env:USERPROFILE\.local\bin"
```

Or permanently via System Properties > Environment Variables.
