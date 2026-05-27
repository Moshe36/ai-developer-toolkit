# ai-developer-toolkit

Single source of truth for AI developer instructions, skills, agents, commands, and hooks.
All supported tools read directly from this repo via symlinks — no copies, no drift.

## New machine setup

### 1. Prerequisites

**Windows only:** Enable Developer Mode (required for symlinks without admin rights).

```
Settings → System → For developers → Developer Mode → On
```

Or via PowerShell (run as Administrator):

```powershell
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /t REG_DWORD /f /v AllowDevelopmentWithoutDevLicense /d 1
```

### 2. Clone the repo

Clone to your home directory (or anywhere — the script uses its own location):

```powershell
git clone https://github.com/Moshe36/ai-developer-toolkit.git "$env:USERPROFILE\ai-developer-toolkit"
```

### 3. Run setup

```powershell
& "$env:USERPROFILE\ai-developer-toolkit\setup.ps1"
```

That's it. The script creates symlinks from each tool's config location into this repo.
Re-run it any time to repair broken links (e.g. after re-cloning on a new machine).

### 4. Keeping up to date

```powershell
git -C "$env:USERPROFILE\ai-developer-toolkit" pull
```

No re-run needed. Tools read through the symlinks, so a pull is instantly live.

---

## What gets wired up

| Tool | File/folder linked |
|---|---|
| **Claude Code** | `~/.claude/CLAUDE.md`, `skills/`, `agents/`, `commands/`, `hooks/` |
| **OpenCode** | `~/.config/opencode/AGENTS.md` (also reads `~/.claude/` natively as fallback) |
| **Copilot IntelliJ** | `global-copilot-instructions.md`, `global-agents-instructions.md`, `global-git-commit-instructions.md` |

---

## Repo structure

```
instructions/   Canonical AI behavior rules
  SHARED.md       Single source of truth — all tools derive from this
  CLAUDE.md       Claude Code-specific additions
  COPILOT.md      Copilot IntelliJ-specific additions
  GIT_COMMIT.md   Git commit message guidelines

skills/         Reusable skill definitions (loaded on-demand by AI tools)
agents/         Sub-agent role definitions
commands/       Slash commands / custom prompts
hooks/          Automation scripts triggered by tool events
docs/           Specs, ADRs, plans
mcp/            MCP server config references (machine-local, not committed)
```

---

## Adding content

| What | Where | Extra step |
|---|---|---|
| New skill | `skills/<name>/skill.md` | Add trigger rules to `skills/skill-rules.json` |
| New agent | `agents/<name>.md` | None |
| New slash command | `commands/<name>.md` | None |
| New hook | `hooks/<name>.mjs` | Register in Claude Code settings |
| Instruction change | `instructions/SHARED.md` | Propagates to all tools automatically |
