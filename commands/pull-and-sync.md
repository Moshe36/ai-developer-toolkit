---
description: Pull from dev and automatically sync context documentation based on code changes
argument-hint: "[branch] [commit] - branch (default: dev), optional commit to compare from"
---

# Pull and Sync Documentation

Pull the latest code from the specified branch (default: dev) and automatically update project context documentation based on code changes.

## Instructions

### Step 0: Parse Arguments

Parse arguments to handle both branch name and optional commit hash:
- **First argument**: branch name (defaults to "dev" if not provided)
- **Second argument** (optional): commit hash to compare from

**If commit hash is provided**, assume user already pulled manually and skip the pull step.
**If no commit hash**, perform pull and use reflog `@{1}` to compare.

### Step 1: Pull from Remote (Conditional)

**Only if no commit hash was provided:**

```bash
git pull origin [branch]
```

**If commit hash WAS provided**, skip this step entirely (user already pulled).

Capture the output and check if pull was successful.

### Step 2: Analyze Code Changes (Exclude .md files)

Get the diff of what changed, **excluding all .md files**:

**If commit hash provided:**
```bash
git diff [commit]..[branch] --name-status -- . ':!*.md'
```

**If no commit hash (normal flow):**
```bash
git diff [branch]@{1}..[branch] --name-status -- . ':!*.md'
```

This shows all code changes (tsx, ts, js, graphql, json, etc.) but ignores documentation files.

### Step 3: Categorize Changes

Based on the diff, identify which documentation files need updating:

**COMPONENT_MAP.md updates needed if:**
- Changes in `src/components/**/*.tsx`
- Changes in `src/components/**/*.ts`
- New component folders created
- Components deleted

**HOOKS_REFERENCE.md updates needed if:**
- Changes in `src/hooks/**/*.ts`
- Changes in `features/**/hooks/*.ts`
- New hooks created (files starting with `use`)
- Hooks deleted

**STATE_ARCHITECTURE.md updates needed if:**
- Changes in `src/redux/slices/**/*.ts`
- New Redux slices created
- Slices deleted or renamed

**API_REFERENCE.md updates needed if:**
- Changes in `backendApi/graphql/operations/**/*.graphql`
- New GraphQL queries/mutations/subscriptions
- GraphQL operations deleted

**SIDE_PANELS_REFERENCE.md updates needed if:**
- Changes in `src/components/SidePanels/**/*.tsx`
- New side panels created
- Side panels deleted

**COMPONENT_STATE_XREF.md updates needed if:**
- Component files show new Redux selector usage
- New useAppSelector/useAppDispatch calls

### Step 4: Update Documentation Files

For each documentation file that needs updating:

1. **Read the existing documentation file**
2. **Read the changed code files** to understand what was added/modified/deleted
3. **Update the documentation** with:
   - New entries for added items
   - Updated entries for modified items
   - Removed entries for deleted items
   - Updated "Last Updated" timestamp
4. **Maintain the existing format and structure**

### Step 5: Summary Report

After updating all relevant documentation, provide a summary:

```
📚 Documentation Sync Summary

Changes detected:
- 3 components modified
- 2 new hooks added
- 1 GraphQL operation added

Documentation updated:
✅ COMPONENT_MAP.md (updated 3 entries)
✅ HOOKS_REFERENCE.md (added 2 entries)
✅ API_REFERENCE.md (added 1 entry)

Files modified:
- .claude-dev/context/COMPONENT_MAP.md
- .claude-dev/context/HOOKS_REFERENCE.md
- .claude-dev/context/API_REFERENCE.md
```

### Step 6: Offer to Commit

Ask the user:
```
Would you like me to commit these documentation updates?
- Yes: Create commit with message "docs: sync context docs with dev"
- No: Leave changes staged for manual review
```

## Important Notes

1. **Only analyze CODE changes** - All .md files are excluded from diff analysis
2. **Preserve existing structure** - Don't reformat or reorganize existing docs
3. **Accurate updates only** - Read actual code to verify changes before updating docs
4. **Update timestamps** - Always update "Last Updated: YYYY-MM-DD" in modified docs
5. **Handle deletions** - Remove entries for deleted components/hooks/etc.

## Edge Cases

- **No changes detected**: Report "No code changes detected, documentation is up to date"
- **Pull failed**: Stop and report the git error, don't update docs
- **Conflicts**: If git pull has merge conflicts, stop and ask user to resolve first
- **Empty diff**: If diff shows no relevant changes, report "No documentation updates needed"

## Example Usage

```bash
# Pull from dev (default) and sync
/pull-and-sync

# Pull from specific branch and sync
/pull-and-sync feature/new-components

# Pull from main and sync
/pull-and-sync main

# Already pulled manually? Sync from specific commit to dev
/pull-and-sync dev abc1234

# Already pulled manually? Sync from specific commit to main
/pull-and-sync main def5678

# Using short commit hash
/pull-and-sync dev HEAD~5
```

---

**Goal**: Keep context documentation automatically synchronized with code changes, requiring minimal manual effort from the developer.
