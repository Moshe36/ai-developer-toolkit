#!/usr/bin/env python3
"""Derive <slug>-mermaid-only.md from <slug>-sequence-diagrams.md.

The second deliverable is generated, never hand-written, so the two files cannot
drift apart.

Usage:
    python extract_mermaid.py <sequence-diagrams.md> <mermaid-only.md>
                              [--title "<Service Name>"]

Exit code 0 on success, 1 when the source file has no usable diagrams or when a
flow heading has no diagram.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

FENCE_OPEN = re.compile(r"^\s*```+\s*mermaid\s*$", re.IGNORECASE)
FENCE_ANY = re.compile(r"^\s*```+\s*$")
FLOW_HEADING = re.compile(r"^###\s+(?P<num>\d+)\.\s+(?P<name>.+?)\s*$")
DOC_TITLE = re.compile(r"^#\s+(?P<title>.+?)\s*$")


def parse(lines: list[str]) -> tuple[str, list[tuple[int, str, list[str]]]]:
    """Return (document title, [(flow number, flow name, mermaid body)])."""
    title = ""
    flows: list[tuple[int, str, list[str]]] = []
    current: tuple[int, str] | None = None

    index = 0
    total = len(lines)
    while index < total:
        line = lines[index]

        if not title:
            doc = DOC_TITLE.match(line)
            if doc:
                title = doc.group("title")

        heading = FLOW_HEADING.match(line)
        if heading:
            current = (int(heading.group("num")), heading.group("name"))
            index += 1
            continue

        if FENCE_OPEN.match(line):
            body: list[str] = []
            index += 1
            closed = False
            while index < total:
                if FENCE_ANY.match(lines[index]):
                    closed = True
                    break
                body.append(lines[index].rstrip())
                index += 1
            if not closed:
                print(f"ERROR: unclosed mermaid fence near line {index}", file=sys.stderr)
                raise SystemExit(1)
            if not any(b.strip().startswith("sequenceDiagram") for b in body):
                index += 1
                continue
            if current is None:
                print(
                    f"ERROR: mermaid block near line {index} is not under a '### <n>. <name>' flow heading",
                    file=sys.stderr,
                )
                raise SystemExit(1)
            flows.append((current[0], current[1], body))
            current = None

        index += 1

    return title, flows


def render(title: str, flows: list[tuple[int, str, list[str]]]) -> str:
    service = re.sub(r"\s*Runtime Sequence Diagrams Package\s*$", "", title).strip() or title
    out: list[str] = [f"# {service} Mermaid Runtime Sequence Diagrams", ""]
    for number, name, body in flows:
        out.append(f"## {number}. {name}")
        out.append("")
        out.append("```mermaid")
        out.extend(body)
        out.append("```")
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Derive the mermaid-only deliverable.")
    parser.add_argument("source", type=pathlib.Path)
    parser.add_argument("target", type=pathlib.Path)
    parser.add_argument("--title", default=None, help="override the service name in the heading")
    args = parser.parse_args()

    if not args.source.exists():
        print(f"ERROR: {args.source} does not exist", file=sys.stderr)
        return 1

    lines = args.source.read_text(encoding="utf-8").splitlines()
    title, flows = parse(lines)

    if not flows:
        print(f"ERROR: no flow diagrams found in {args.source}", file=sys.stderr)
        return 1

    numbers = [n for n, _, _ in flows]
    if numbers != sorted(numbers) or len(set(numbers)) != len(numbers):
        print(f"ERROR: flow numbering is not unique and ascending: {numbers}", file=sys.stderr)
        return 1

    args.target.parent.mkdir(parents=True, exist_ok=True)
    args.target.write_text(render(args.title or title, flows), encoding="utf-8")

    print(f"extract_mermaid: wrote {args.target} with {len(flows)} diagram(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
