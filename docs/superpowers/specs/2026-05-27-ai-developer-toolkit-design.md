# AI Developer Toolkit — Repository Design

**Date:** 2026-05-27  
**Status:** Approved

## Purpose

Centralize all AI developer instructions, skills, agents, commands, and hooks into a single version-controlled repository. The repo becomes the source of truth; tool-specific config locations (e.g., `~/.claude/`) are populated from here.

## Guiding Principle

Organize by **what content is**, not **which tool consumes it**. Skills describe coding practices. Agents describe roles. Instructions describe behavior rules. These concepts exist independently of whether Claude, Copilot, or another tool reads them.

Tool-specific mapping (which file goes where) is a deployment concern — handled at the edges (install scripts), not in the content structure.

## Repository Structure

```
ai-developer-toolkit/
├── README.md                    # Repo purpose, structure, usage
├── instructions/                # Global AI behavior rules
│   └── CLAUDE.md                # Claude Code global instructions
├── skills/                      # Reusable skill definitions
│   ├── backend-dev-guidelines/
│   ├── error-tracking/
│   ├── frontend-dev-guidelines/
│   ├── mapping-project-overview/
│   ├── skill-developer/
│   └── skill-rules.json
├── agents/                      # Agent/subagent role definitions
│   └── *.md
├── commands/                    # Slash commands / custom prompts
│   └── *.md
├── hooks/                       # Automation scripts triggered by tool events
│   └── *.ps1, *.ts
└── docs/                        # Specs, ADRs, plans
    └── superpowers/
        └── specs/
```

## Content Migrated (Phase 1 — Claude)

All content from `~/.claude/` excluding runtime/cache data:

| Source | Destination |
|--------|-------------|
| `~/.claude/CLAUDE.md` | `instructions/CLAUDE.md` |
| `~/.claude/skills/*` | `skills/*` |
| `~/.claude/agents/*` | `agents/*` |
| `~/.claude/commands/*` | `commands/*` |
| `~/.claude/hooks/*` | `hooks/*` |

**Excluded from migration** (runtime/local data, not source of truth):
- `~/.claude/cache/`, `history.jsonl`, `stats-cache.json`, `statsig/`, `telemetry/`
- `~/.claude/projects/`, `todos/`, `plans/`, `session-env/`, `shell-snapshots/`
- `~/.claude/.credentials.json`
- `~/.claude/hooks/node_modules/`

## Future Phases

- `instructions/AGENTS.md` — GitHub Copilot agent instructions
- `instructions/GEMINI.md` — Gemini CLI instructions
- Commit message templates, VS Code settings, etc.
- Install script to symlink/copy repo content to tool destinations

## Decisions

- **No tool-hierarchy at top level** — content folders are concept-based, not tool-based
- **Structure only for now** — no install/sync automation in this phase
- **docs/ is repo-level** — specs and plans are cross-tool concerns
