#!/usr/bin/env python3
"""Deterministic linter for master-hld-generator output.

Checks the mechanically decidable rules from references/authoring-rules.md so
that no model has to grade its own compliance.

Usage:
    python lint_hld.py <file.md> [<file.md> ...] [--strict] [--quiet]

    --strict   merged-deliverable mode: additionally require RT comments and an
               error-scenario section in every diagram. Trace-table cross-checks
               are skipped because the merged file does not carry the tables.
    --quiet    print only errors, suppress warnings.

Exit code 0 when no errors, 1 otherwise. Warnings never fail the run.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

# --------------------------------------------------------------------------- #
# patterns
# --------------------------------------------------------------------------- #

FENCE_OPEN = re.compile(r"^\s*```+\s*mermaid\s*$", re.IGNORECASE)
FENCE_ANY = re.compile(r"^\s*```+\s*$")

PARTICIPANT = re.compile(
    r"^\s*(?:participant|actor)\s+(?P<alias>[A-Za-z_]\w*)"
    r"(?:\s+as\s+(?P<name>.+?))?\s*$",
    re.IGNORECASE,
)

ARROW = re.compile(
    r"^\s*(?P<from>[A-Za-z_]\w*)\s*"
    r"(?P<op>-{1,2}(?:>>|>|x|\)))\s*"
    r"(?P<act>[+-])?\s*"
    r"(?P<to>[A-Za-z_]\w*)\s*:\s*(?P<label>.*)$"
)

NOTE_OVER = re.compile(r"^\s*Note\s+over\s+(?P<targets>[^:]+):\s*(?P<text>.*)$", re.IGNORECASE)
NOTE_SIDE = re.compile(
    r"^\s*Note\s+(?:right\s+of|left\s+of)\s+(?P<target>[^:]+):\s*(?P<text>.*)$",
    re.IGNORECASE,
)

BLOCK_OPEN = re.compile(r"^\s*(alt|opt|loop|par|critical|rect|break|box)\b(?P<label>.*)$", re.IGNORECASE)
BLOCK_CONT = re.compile(r"^\s*(else|and|option)\b(?P<label>.*)$", re.IGNORECASE)
BLOCK_END = re.compile(r"^\s*end\s*$", re.IGNORECASE)

RT_COMMENT = re.compile(r"%%\s*(RT-\d+)")
ER_TOKEN = re.compile(r"\bER-\d+\b")
RT_ROW = re.compile(r"^\s*\|\s*(RT-\d+)\s*\|")
ER_ROW = re.compile(r"^\s*\|\s*(ER-\d+)\s*\|")
EVIDENCE = re.compile(r"[\w./\\-]+\.[A-Za-z0-9]+:\d+")

ARROW_TOKENS = ("-->>", "->>", "-->", "->", "<--", "<-", "<<", ">>")
JAVA_CALL = re.compile(r"\b[A-Za-z_]\w*\(")

SECTION_HAPPY = re.compile(r"^happy\s*path$", re.IGNORECASE)
SECTION_ERROR = re.compile(r"^error\s*scenarios$", re.IGNORECASE)

GENERIC_TITLE = re.compile(
    r"^(error|errors|failure|failed|exception|exceptions|validation\s+error|"
    r"db\s+error|database\s+error|service\s+error|runtime\s+exception|unknown)\.?$",
    re.IGNORECASE,
)

HAPPY_FORBIDDEN = (
    "(else",
    "(otherwise",
    "else return",
    "else throw",
    "if missing",
    "if invalid",
    "if failed",
    "not found",
    "error",
    "exception",
    "failure",
    "failed",
)

VAGUE_LABELS = {
    "process request",
    "handle flow",
    "perform logic",
    "validate",
    "get data",
    "update entity",
    "save data",
    "return response",
    "build response",
    "db error",
    "service error",
    "validation error",
    "exception",
}

# A label that IS a method name, rather than a label that merely mentions mapping.
# "map saved OrderEntity to OrderDto" is behavior; "toDto(entity)" is a method name.
METHOD_NAME_LABEL = re.compile(
    r"^(to[A-Z]\w*|toDto|mapTo\w*|convert|buildDto|build[A-Z]\w*Dto|fromEntity|toApi|map)"
    r"\s*(?:\(.*\))?\s*$"
)


# --------------------------------------------------------------------------- #
# reporting
# --------------------------------------------------------------------------- #


class Report:
    def __init__(self, path: pathlib.Path) -> None:
        self.path = path
        self.errors: list[tuple[int, str, str]] = []
        self.warnings: list[tuple[int, str, str]] = []

    def error(self, line: int, code: str, message: str) -> None:
        self.errors.append((line, code, message))

    def warn(self, line: int, code: str, message: str) -> None:
        self.warnings.append((line, code, message))

    def emit(self, quiet: bool) -> None:
        items = [("ERROR", *e) for e in self.errors]
        if not quiet:
            items += [("warn ", *w) for w in self.warnings]
        for level, line, code, message in sorted(items, key=lambda e: e[1]):
            print(f"{self.path}:{line}: {level} [{code}] {message}")


# --------------------------------------------------------------------------- #
# mermaid block extraction
# --------------------------------------------------------------------------- #


def extract_blocks(lines: list[str], report: Report) -> list[tuple[int, list[str]]]:
    """Return (start_line_number, body_lines) for each fenced mermaid block."""
    blocks: list[tuple[int, list[str]]] = []
    index = 0
    total = len(lines)
    while index < total:
        if FENCE_OPEN.match(lines[index]):
            start = index + 1
            body: list[str] = []
            index += 1
            closed = False
            while index < total:
                if FENCE_ANY.match(lines[index]):
                    closed = True
                    break
                body.append(lines[index])
                index += 1
            if not closed:
                report.error(start, "unclosed-fence", "mermaid block is never closed")
            blocks.append((start, body))
        index += 1
    return blocks


def is_illustrative(body: list[str]) -> bool:
    """Documentation snippets in the reference files are not full diagrams."""
    return not any(line.strip().startswith("sequenceDiagram") for line in body)


# --------------------------------------------------------------------------- #
# per-diagram checks
# --------------------------------------------------------------------------- #


def label_has_arrow_token(text: str) -> str | None:
    for token in ARROW_TOKENS:
        if token in text:
            return token
    return None


def check_diagram(start: int, body: list[str], report: Report, strict: bool) -> None:
    declared: set[str] = set()
    stack: list[tuple[int, str]] = []
    section = None  # None | "happy" | "error"
    seen_happy = False
    seen_error = False
    rt_ids: set[str] = set()
    er_ids: set[str] = set()

    # branch-title tracking: after an alt/else inside the error section, the very
    # next non-blank, non-comment line must be a `Note right of` title.
    awaiting_title: tuple[int, str] | None = None

    for offset, raw in enumerate(body):
        lineno = start + offset + 1
        line = raw.rstrip()
        stripped = line.strip()

        if not stripped:
            continue

        # collect RT ids from comments before skipping comment lines
        for match in RT_COMMENT.finditer(stripped):
            rt_ids.add(match.group(1))
        if stripped.startswith("%%"):
            continue

        participant = PARTICIPANT.match(stripped)
        if participant:
            declared.add(participant.group("alias"))
            continue

        if stripped.lower().startswith("sequencediagram") or stripped.lower().startswith("title"):
            continue
        if stripped.lower().startswith(("autonumber", "activate", "deactivate", "destroy", "link ", "style ")):
            continue

        note_over = NOTE_OVER.match(stripped)
        note_side = NOTE_SIDE.match(stripped)

        # ---- pending branch title -------------------------------------- #
        if awaiting_title is not None:
            branch_line, branch_label = awaiting_title
            if not note_side:
                report.error(
                    branch_line,
                    "missing-title-note",
                    f"error branch '{branch_label}' does not open with a "
                    f"'Note right of <participant>: ER-xx - <what failed>' title note",
                )
            awaiting_title = None

        # ---- notes ------------------------------------------------------ #
        if note_over:
            text = note_over.group("text").strip()
            if SECTION_HAPPY.match(text):
                section, seen_happy = "happy", True
                if seen_error:
                    report.error(lineno, "section-order", "'Happy path' appears after 'Error scenarios'")
            elif SECTION_ERROR.match(text):
                section, seen_error = "error", True
                if not seen_happy:
                    report.error(lineno, "section-order", "'Error scenarios' appears before 'Happy path'")
            else:
                report.error(
                    lineno,
                    "note-over-misuse",
                    "'Note over' is reserved for the 'Happy path' and 'Error scenarios' "
                    f"section titles; found: {text!r}",
                )
            token = label_has_arrow_token(text)
            if token:
                report.error(lineno, "arrow-token-in-note", f"note text contains {token!r}")
            continue

        if note_side:
            target = note_side.group("target").strip()
            text = note_side.group("text").strip()
            for name in re.split(r"\s*,\s*", target):
                if name and name not in declared:
                    report.error(lineno, "undeclared-participant", f"note anchored to undeclared participant {name!r}")
            token = label_has_arrow_token(text)
            if token:
                report.error(lineno, "arrow-token-in-note", f"note text contains {token!r}")
            for match in ER_TOKEN.finditer(text):
                er_ids.add(match.group(0))
            if section == "error":
                ids = ER_TOKEN.findall(text)
                if not ids:
                    report.error(
                        lineno,
                        "title-note-no-id",
                        "error-branch title note does not name any ER id",
                    )
                description = ER_TOKEN.sub("", text).strip(" —-/|:").strip()
                if not description:
                    report.error(
                        lineno,
                        "title-note-bare-id",
                        "error-branch title note is only an ER id with no description",
                    )
                elif GENERIC_TITLE.match(description):
                    report.error(
                        lineno,
                        "title-note-generic",
                        f"error-branch title note is generic: {description!r}",
                    )
            elif section == "happy":
                report.error(
                    lineno,
                    "note-in-happy-path",
                    "notes are not allowed in the Happy path; use a real arrow or a return arrow",
                )
            continue

        # ---- block structure -------------------------------------------- #
        if BLOCK_END.match(stripped):
            if not stack:
                report.error(lineno, "unbalanced-block", "'end' without a matching block opener")
            else:
                stack.pop()
            continue

        block_open = BLOCK_OPEN.match(stripped)
        block_cont = BLOCK_CONT.match(stripped)

        if block_cont:
            label = block_cont.group("label").strip()
            if not stack:
                report.error(lineno, "unbalanced-block", f"'{block_cont.group(1)}' outside any block")
            for match in ER_TOKEN.finditer(label):
                er_ids.add(match.group(0))
            if section == "error" and block_cont.group(1).lower() == "else":
                if not label:
                    report.error(lineno, "empty-branch-label", "'else' branch has no label")
                elif GENERIC_TITLE.match(label.strip()):
                    report.error(lineno, "generic-branch-label", f"generic error branch label: {label!r}")
                awaiting_title = (lineno, label or "else")
            continue

        if block_open:
            keyword = block_open.group(1).lower()
            label = block_open.group("label").strip()
            stack.append((lineno, keyword))
            for match in ER_TOKEN.finditer(label):
                er_ids.add(match.group(0))
            if section == "error" and keyword == "alt":
                if not label:
                    report.error(lineno, "empty-branch-label", "'alt' branch has no label")
                elif GENERIC_TITLE.match(label.strip()):
                    report.error(lineno, "generic-branch-label", f"generic error branch label: {label!r}")
                awaiting_title = (lineno, label or "alt")
            continue

        # ---- arrows ------------------------------------------------------ #
        arrow = ARROW.match(stripped)
        if arrow:
            label = arrow.group("label").strip()
            for name in (arrow.group("from"), arrow.group("to")):
                if name not in declared:
                    report.error(lineno, "undeclared-participant", f"undeclared participant {name!r}")
            token = label_has_arrow_token(label)
            if token:
                report.error(lineno, "arrow-token-in-label", f"label contains mermaid arrow token {token!r}")
            if not label:
                report.error(lineno, "empty-label", "arrow has an empty label")
            if JAVA_CALL.search(label):
                report.error(lineno, "java-signature", f"label looks like a method call: {label!r}")
            if ";" in label:
                report.warn(lineno, "multi-action-label", "label joins actions with ';' — split into several arrows")
            if label.lower() in VAGUE_LABELS:
                report.error(lineno, "vague-label", f"vague label: {label!r}")
            if METHOD_NAME_LABEL.match(label):
                report.error(lineno, "method-name-label", f"label is a method name, not behavior: {label!r}")
            if len(label) > 100:
                report.warn(lineno, "long-label", f"label is {len(label)} characters — split it or move detail to Notes")
            if section == "happy" or (section is None and not seen_error):
                lowered = label.lower()
                for phrase in HAPPY_FORBIDDEN:
                    if phrase in lowered:
                        report.error(
                            lineno,
                            "failure-wording-in-happy-path",
                            f"Happy-path label contains failed-alternative wording {phrase!r}: {label!r}",
                        )
                        break
            for match in ER_TOKEN.finditer(label):
                er_ids.add(match.group(0))
            continue

        report.warn(lineno, "unrecognized-line", f"line not recognized as mermaid sequence syntax: {stripped!r}")

    if awaiting_title is not None:
        branch_line, branch_label = awaiting_title
        report.error(
            branch_line,
            "missing-title-note",
            f"error branch '{branch_label}' does not open with a title note",
        )

    for lineno, keyword in stack:
        report.error(lineno, "unbalanced-block", f"'{keyword}' block is never closed with 'end'")

    if strict:
        if not rt_ids:
            report.error(start, "no-rt-comments", "diagram has no '%% RT-xx' trace markers")
        if not seen_error:
            report.error(start, "no-error-section", "diagram has no 'Error scenarios' section")

    _diagram_ids.append((start, rt_ids, er_ids))


_diagram_ids: list[tuple[int, set[str], set[str]]] = []


# --------------------------------------------------------------------------- #
# trace-table checks (flow-notes files only)
# --------------------------------------------------------------------------- #


def check_traces(lines: list[str], report: Report) -> tuple[set[str], set[str]]:
    rt_ids: set[str] = set()
    er_ids: set[str] = set()
    for offset, raw in enumerate(lines):
        lineno = offset + 1
        rt_match = RT_ROW.match(raw)
        er_match = ER_ROW.match(raw)
        if not rt_match and not er_match:
            continue
        identifier = (rt_match or er_match).group(1)
        (rt_ids if rt_match else er_ids).add(identifier)
        if not EVIDENCE.search(raw):
            report.error(
                lineno,
                "missing-evidence",
                f"{identifier} has no 'path/File.ext:LINE' evidence citation",
            )
    return rt_ids, er_ids


# --------------------------------------------------------------------------- #
# driver
# --------------------------------------------------------------------------- #


def lint_file(path: pathlib.Path, strict: bool, quiet: bool) -> int:
    report = Report(path)
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    blocks = extract_blocks(lines, report)
    if not blocks:
        report.error(1, "no-diagram", "file contains no fenced mermaid block")

    _diagram_ids.clear()
    for start, body in blocks:
        if is_illustrative(body):
            continue
        check_diagram(start, body, report, strict)

    diagram_rt = set().union(*(ids for _, ids, _ in _diagram_ids)) if _diagram_ids else set()
    diagram_er = set().union(*(ids for _, _, ids in _diagram_ids)) if _diagram_ids else set()

    if not strict:
        trace_rt, trace_er = check_traces(lines, report)
        for identifier in sorted(trace_rt - diagram_rt):
            report.error(1, "rt-not-in-diagram", f"{identifier} is in the Runtime Trace but not in any diagram")
        for identifier in sorted(trace_er - diagram_er):
            report.error(1, "er-not-in-diagram", f"{identifier} is in the Error Trace but not in any diagram")

    report.emit(quiet)
    return len(report.errors)


def main() -> int:
    parser = argparse.ArgumentParser(description="Lint master-hld-generator Mermaid output.")
    parser.add_argument("files", nargs="+", type=pathlib.Path)
    parser.add_argument("--strict", action="store_true", help="merged-deliverable mode")
    parser.add_argument("--quiet", action="store_true", help="suppress warnings")
    args = parser.parse_args()

    total = 0
    for path in args.files:
        if not path.exists():
            print(f"{path}: ERROR [missing-file] file does not exist")
            total += 1
            continue
        total += lint_file(path, args.strict, args.quiet)

    if total:
        print(f"\nlint_hld: {total} error(s)")
        return 1
    print("lint_hld: pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
