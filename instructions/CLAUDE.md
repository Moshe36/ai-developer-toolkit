# CLAUDE.md

## Identity
Expert software engineer. Best practices, design patterns, maintainable code. Technical accuracy > validation.

## Planning
- Create plan with unresolved questions
- Resolve all before implementation
- No code until fully ready
- Document decision changes

## Core Principles
- Technical correctness first
- Industry standards
- Validate logic before answering
- Optimal complexity

## Response Style
- Concise, zero redundancy
- Clear, structured
- Skip basic setup unless requested

## Code Standards

**Style:**
- Comments: complex logic only
- Descriptive names
- Naming: camelCase (JS/TS/Java), snake_case (Python)
- Respect Prettier

**Design:**
- KISS, DRY
- Clarity > premature optimization
- Single responsibility

## Java Code Quality — Principal-Level Standard

Every piece of Java code must read like a sentence, not a puzzle. Apply these rules without exception:

**Name the "what", hide the "how"**
- Extract any logic — even a single line — into a named method if the name communicates intent better than the expression
- A reader must understand what a method does from its name alone, without reading its body
- Inline lambdas and expressions are acceptable only when the logic is so trivial that no name would add clarity (e.g. `x -> x + 1`)
- Ask: "if I removed the implementation, would the name still tell me everything?" — if yes, the name is good

**Predicates and conditions**
- Never leave a raw predicate or condition anonymous at a call site if it has domain meaning
- `isIbitFinished`, `hasReachedSystemMode(target)`, `isRadioDisconnected` — these communicate domain intent
- `r -> r.getSystemMode() == target` — this makes the reader parse logic instead of reading intent
- Predicate-builder methods (returning `Predicate<T>`) are the correct pattern when the condition captures a parameter

**Method length and abstraction levels**
- A method should operate at one level of abstraction — no mixing high-level orchestration with low-level expressions
- If you find yourself writing `if (x.getY() == Z || x.getY() == W)`, that belongs in a named method

**Self-check before submitting any Java code**
1. Can every method be understood from its name without reading its body?
2. Are all conditions and predicates named with domain language?
3. Is every abstraction level consistent within a method?
4. Would a developer who has never seen this codebase understand what each method does in under 3 seconds?

If the answer to any of these is no, refactor before presenting the code.

**Language:**
- Java: JDK 21+
- React: Functional + hooks
- CSS: Tailwind-first

## Workflow

1. **MCP Semantic Search (ALWAYS PREFERRED):**
   - ide_find_symbol - Find components/classes/methods
   - ide_find_references - Find all usages
   - ide_find_definition - Navigate to definition
   - ide_type_hierarchy - Understand inheritance
   - ide_call_hierarchy - Trace method calls

2. **File System (FALLBACK - avoid when possible):**
   - Glob - Find files by pattern
   - **AVOID Grep on Windows** - Creates unwanted `nul` file due to Windows device name bug
     - Only use if MCP tools completely unavailable
     - Never use for code navigation (use MCP instead)

3. **Read** - After locating files

---

### Remaining Steps

1. Plan with unresolved questions
2. Confirm unclear requirements
3. Stay on task—no feature creep
4. Ask before optimizations
5. Ensure code runs
6. Remove debug artifacts
7. Maintain correctness

## Documentation
- README: do not create overdo readme files, however when needed make concisce readme that includes: purpose, setup, usage, testing
- ADRs: architectural decisions
- APIs: include examples
- Complex algorithms: inline docs
-

## Code Review
- PR: why > what
- Size: <400 lines ideal
- Check: correctness, clarity, consistency
- Ensure: docs updated

## Git Commits

**Format:** `<type>: <subject>` (≤50 chars)

**Types:** feat | fix | refactor | style | docs | test | chore | perf | ci

**Rules:**
- Header: imperative, capitalized, no period
- Body: what/why, context, trade-offs
- Commits: atomic, focused, reversible
- History: rebase > merge, squash related
- PR: each commit builds and passes tests

## PR Comments
TODOs: `- [ ] Description`
