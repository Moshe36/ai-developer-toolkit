#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const TRACKED_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

function extractFilePaths(toolInput) {
    const paths = [];
    if (toolInput?.file_path) paths.push(toolInput.file_path);
    if (toolInput?.files) paths.push(...toolInput.files.map(f => f.path));
    return paths;
}

try {
    const data = JSON.parse(readFileSync(0, 'utf-8'));
    const { session_id, tool_name, tool_input, cwd } = data;

    if (!TRACKED_TOOLS.has(tool_name)) process.exit(0);

    const filePaths = extractFilePaths(tool_input);
    if (filePaths.length === 0) process.exit(0);

    const trackingDir = join(cwd || process.cwd(), '.claude-dev', 'tracking', session_id);
    if (!existsSync(trackingDir)) mkdirSync(trackingDir, { recursive: true });

    const timestamp = new Date().toISOString();
    const logEntries = filePaths.map(p => `${timestamp}\t${tool_name}\t${p}`).join('\n') + '\n';
    writeFileSync(join(trackingDir, 'edited-files.log'), logEntries, { flag: 'a' });

    process.exit(0);
} catch {
    process.exit(0);
}
