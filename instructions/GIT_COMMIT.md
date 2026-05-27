# Git Commit Guidelines

## Structure
- Separate each commit message into a **header** and an optional **body**.
- The **header** is a concise summary of the change (≤50 characters).
- The **body** provides context, motivation, detailed explanation and rationale (wrap at ~100 chars for readability).
- Keep commits **atomic** — one logical change per commit.

## Header
- Use **imperative mood** (e.g., "Fix bug", not "Fixed bug").
- **Capitalize** the first letter.
- **Do not** end with a period.
- Optionally prefix with a **type** (recommended for consistency):
    - feat: New feature
    - fix: Bug fix
    - refactor: Code change that neither fixes a bug nor adds a feature
    - style: Code formatting only (no logic change)
    - docs: Documentation updates
    - test: Tests added or updated
    - chore: Maintenance, tooling, or build-related tasks
    - perf: Performance improvements
    - ci: Continuous integration configuration

## Body
- Explain **what changed** and **why it was necessary**.
- Provide **context, motivation, and impact**.
- Mention **trade-offs**, **edge cases**, or **limitations** if applicable.
- Use bullet points for multiple details.
- Reference related issues or PRs (`Closes #123`, `Refs #456`).
