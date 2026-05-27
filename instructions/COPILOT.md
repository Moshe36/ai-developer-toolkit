# COPILOT.md

All core principles, code standards, Java quality rules, git, and review guidelines live in:
**`instructions/SHARED.md`** — read that first.

This file contains only what is specific to GitHub Copilot in IntelliJ.

---

## Code Navigation — Tool Priority

Always prefer semantic search over filesystem search:

1. **IDE tools (preferred):**
   - Find usages, go to definition, type hierarchy, call hierarchy — use the IDE's built-in understanding of the codebase

2. **Filesystem search (fallback):**
   - Only when IDE tools are unavailable or insufficient

## Scope Discipline

Copilot operates in the context of the active file and open editor. Stay focused on what is in scope. Do not propose changes to files that are not part of the current task without explicit instruction.

## Inline Suggestions

- Accept suggestions critically — verify correctness before accepting, especially for logic and edge cases
- Partial acceptance is better than accepting a wrong suggestion and fixing it after
