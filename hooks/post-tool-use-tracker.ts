#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, relative } from 'path';

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode: string;
    hook_event_name: string;
    tool_name: string;
    tool_input?: {
        file_path?: string;
        files?: Array<{ path: string }>;
    };
}

async function main() {
    try {
        // Read input from stdin
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        const { session_id, tool_name, tool_input } = data;

        // Only track Edit, Write, MultiEdit tools
        if (!['Edit', 'Write', 'MultiEdit'].includes(tool_name)) {
            process.exit(0);
        }

        // Extract file paths
        const filePaths: string[] = [];
        if (tool_input?.file_path) {
            filePaths.push(tool_input.file_path);
        }
        if (tool_input?.files) {
            filePaths.push(...tool_input.files.map(f => f.path));
        }

        if (filePaths.length === 0) {
            process.exit(0);
        }

        // Setup tracking directory in PROJECT .claude-dev/ folder
        const projectDir = data.cwd || process.cwd();
        const trackingDir = join(projectDir, '.claude-dev', 'tracking', session_id);

        if (!existsSync(trackingDir)) {
            mkdirSync(trackingDir, { recursive: true });
        }

        const logFile = join(trackingDir, 'edited-files.log');
        const timestamp = new Date().toISOString();

        // Append to log file
        const logEntries = filePaths.map(path =>
            `${timestamp}\t${tool_name}\t${path}`
        ).join('\n') + '\n';

        writeFileSync(logFile, logEntries, { flag: 'a' });

        process.exit(0);
    } catch (err) {
        // Silently fail - tracking is optional
        process.exit(0);
    }
}

main().catch(() => process.exit(0));
