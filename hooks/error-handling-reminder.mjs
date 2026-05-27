#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function getFileCategory(filePath) {
    if (filePath.includes('/frontend/') ||
        filePath.includes('/client/') ||
        filePath.includes('/src/components/') ||
        filePath.includes('/src/features/')) return 'frontend';

    if (filePath.includes('/src/controllers/') ||
        filePath.includes('/src/services/') ||
        filePath.includes('/src/routes/') ||
        filePath.includes('/src/api/') ||
        filePath.includes('/server/')) return 'backend';

    if (filePath.includes('/database/') ||
        filePath.includes('/prisma/') ||
        filePath.includes('/migrations/')) return 'database';

    return 'other';
}

function isCodeFile(filePath) {
    if (filePath.match(/\.(test|spec)\.(ts|tsx)$/)) return false;
    if (filePath.match(/\.(config|d)\.(ts|tsx)$/)) return false;
    if (filePath.includes('types/') || filePath.includes('.styles.ts')) return false;
    return filePath.match(/\.(ts|tsx|js|jsx)$/) !== null;
}

function analyzeFile(filePath) {
    if (!existsSync(filePath)) {
        return { hasTryCatch: false, hasAsync: false, hasPrisma: false, hasController: false, hasApiCall: false };
    }
    const content = readFileSync(filePath, 'utf-8');
    return {
        hasTryCatch: /try\s*\{/.test(content),
        hasAsync: /async\s+/.test(content),
        hasPrisma: /prisma\.|PrismaService|findMany|findUnique|create\(|update\(|delete\(/i.test(content),
        hasController: /export class.*Controller|router\.|app\.(get|post|put|delete|patch)/.test(content),
        hasApiCall: /fetch\(|axios\.|apiClient\./i.test(content),
    };
}

try {
    const data = JSON.parse(readFileSync(0, 'utf-8'));
    const { session_id } = data;
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const trackingFile = join(projectDir, '.claude-dev', 'tracking', session_id, 'edited-files.log');

    if (!existsSync(trackingFile)) process.exit(0);

    const editedFiles = readFileSync(trackingFile, 'utf-8')
        .trim().split('\n')
        .filter(Boolean)
        .map(line => { const [timestamp, tool, path] = line.split('\t'); return { timestamp, tool, path }; });

    if (editedFiles.length === 0) process.exit(0);

    const categories = { backend: [], frontend: [], database: [], other: [] };
    const analysisResults = [];

    for (const file of editedFiles) {
        if (!isCodeFile(file.path)) continue;
        const category = getFileCategory(file.path);
        categories[category].push(file.path);
        analysisResults.push({ path: file.path, category, analysis: analyzeFile(file.path) });
    }

    const needsAttention = analysisResults.some(({ analysis }) =>
        analysis.hasTryCatch || analysis.hasAsync || analysis.hasPrisma ||
        analysis.hasController || analysis.hasApiCall
    );

    if (!needsAttention) process.exit(0);

    const line = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    console.log(`\n${line}\n📋 ERROR HANDLING SELF-CHECK\n${line}\n`);

    if (categories.backend.length > 0) {
        const backendResults = analysisResults.filter(f => f.category === 'backend');
        console.log(`⚠️  Backend Changes Detected\n   ${categories.backend.length} file(s) edited\n`);
        if (backendResults.some(f => f.analysis.hasTryCatch))
            console.log('   ❓ Did you add Sentry.captureException() in catch blocks?');
        if (backendResults.some(f => f.analysis.hasPrisma))
            console.log('   ❓ Are Prisma operations wrapped in error handling?');
        if (backendResults.some(f => f.analysis.hasController))
            console.log('   ❓ Do controllers use BaseController.handleError()?');
        console.log('\n   💡 Backend Best Practice:');
        console.log('      - All errors should be captured to Sentry');
        console.log('      - Use appropriate error helpers for context');
        console.log('      - Controllers should extend BaseController\n');
    }

    if (categories.frontend.length > 0) {
        const frontendResults = analysisResults.filter(f => f.category === 'frontend');
        console.log(`💡 Frontend Changes Detected\n   ${categories.frontend.length} file(s) edited\n`);
        if (frontendResults.some(f => f.analysis.hasApiCall))
            console.log('   ❓ Do API calls show user-friendly error messages?');
        if (frontendResults.some(f => f.analysis.hasTryCatch))
            console.log('   ❓ Are errors displayed to the user?');
        console.log('\n   💡 Frontend Best Practice:');
        console.log('      - Use your notification system for user feedback');
        console.log('      - Error boundaries for component errors');
        console.log('      - Display user-friendly error messages\n');
    }

    if (categories.database.length > 0) {
        console.log(`🗄️  Database Changes Detected\n   ${categories.database.length} file(s) edited\n`);
        console.log('   ❓ Did you verify column names against schema?');
        console.log('   ❓ Are migrations tested?\n');
    }

    console.log(`${line}\n💡 TIP: Disable with SKIP_ERROR_REMINDER=1\n${line}\n`);
    process.exit(0);
} catch {
    process.exit(0);
}
