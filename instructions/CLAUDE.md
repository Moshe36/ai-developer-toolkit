# CLAUDE.md

All core principles, code standards, Java quality rules, git, and review guidelines live in:
**`instructions/SHARED.md`** — read that first.

This file contains only what is specific to Claude Code.

---

## Skills

Skills provide specialized workflows for specific tasks. When a task matches a skill's description, invoke it with the `Skill` tool before acting. The `using-superpowers` skill governs when and how to load other skills.

Skills are located in `skills/` and governed by `skills/skill-rules.json`.

## Code Navigation — Tool Priority

Always prefer semantic search over filesystem search:

1. **MCP tools (preferred):**
   - `ide_find_symbol` — find classes, methods, components
   - `ide_find_references` — find all usages
   - `ide_find_definition` — navigate to definition
   - `ide_type_hierarchy` — understand inheritance
   - `ide_call_hierarchy` — trace method calls

2. **Filesystem tools (fallback):**
   - `Glob` — find files by pattern
   - **Avoid `Grep` on Windows** — creates a `nul` file due to a Windows device name collision bug. Use MCP or `Glob` + `Read` instead.
   - `Read` — after locating the file

## Agents

Sub-agent definitions live in `agents/`. Dispatch agents for tasks that benefit from isolation or parallelism. Each agent has a defined role — use the right one for the task.

## Task Management

Use `TodoWrite` to plan and track any task with 3+ distinct steps. Mark todos in real time — not batched at the end.

## Hooks

Hooks in `hooks/` fire automatically on tool events. They are plain `.mjs` scripts requiring only Node. No installation needed.
