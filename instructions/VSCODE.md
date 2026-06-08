# VSCODE.md

All core principles, code standards, Java quality rules, git, and review guidelines live in:
**`instructions/SHARED.md`** — read that first.

This file contains only what is specific to GitHub Copilot in VS Code.

---

## Code Navigation — Tool Priority

Always prefer semantic search over filesystem search:

1. **VS Code tools (preferred):**
   - Go to Definition, Find All References, Call Hierarchy, Type Hierarchy — use VS Code's built-in language intelligence
   - The Problems panel and IntelliSense diagnostics reflect the real state of the codebase

2. **Filesystem search (fallback):**
   - Only when language tools are unavailable or insufficient

## Scope Discipline

Copilot operates in the context of the active editor and open files. Stay focused on what is in scope. Do not propose changes to files outside the current task without explicit instruction.

## Inline Suggestions

- Accept suggestions critically — verify correctness before accepting, especially for logic and edge cases
- Partial acceptance is better than accepting a wrong suggestion and fixing it after
