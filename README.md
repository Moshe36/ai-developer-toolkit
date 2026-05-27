# ai-developer-toolkit

Source of truth for AI developer instructions, skills, agents, commands, and hooks.

## Structure

```
instructions/   Global AI behavior rules (CLAUDE.md, future AGENTS.md, GEMINI.md)
skills/         Reusable skill definitions loaded by AI tools
agents/         Sub-agent role definitions
commands/       Slash commands / custom prompts
hooks/          Automation scripts triggered by tool events
docs/           Specs, ADRs, plans
```

## Usage

Copy or symlink the relevant folders to your tool's config location:

| Folder | Claude Code destination |
|--------|------------------------|
| `instructions/CLAUDE.md` | `~/.claude/CLAUDE.md` |
| `skills/` | `~/.claude/skills/` |
| `agents/` | `~/.claude/agents/` |
| `commands/` | `~/.claude/commands/` |
| `hooks/` | `~/.claude/hooks/` |

## Adding Content

- New skills go in `skills/<skill-name>/skill.md`
- New agents go in `agents/<name>.md`
- New slash commands go in `commands/<name>.md`
- Hook scripts go in `hooks/`
- Update `skills/skill-rules.json` when adding skill trigger rules

## Future

- Copilot instructions → `instructions/AGENTS.md`
- Gemini instructions → `instructions/GEMINI.md`
- Install script to automate symlinking to tool destinations
