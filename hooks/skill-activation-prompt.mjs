#!/usr/bin/env node
import { readFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';

// Cache for parsed rules and compiled regex patterns
let cachedRules = null;
let cachedRulesTimestamp = 0;
const compiledPatterns = new Map();

function loadRules(rulesPath) {
    const stat = statSync(rulesPath);
    if (cachedRules && stat.mtimeMs === cachedRulesTimestamp) {
        return cachedRules;
    }
    cachedRules = JSON.parse(readFileSync(rulesPath, 'utf-8'));
    cachedRulesTimestamp = stat.mtimeMs;
    compiledPatterns.clear();
    return cachedRules;
}

function getCompiledPatterns(skillName, patterns) {
    if (!compiledPatterns.has(skillName)) {
        compiledPatterns.set(skillName, patterns.map(p => new RegExp(p, 'i')));
    }
    return compiledPatterns.get(skillName);
}

function resolveRulesPath(projectDir, homeDir) {
    const globalPath = join(homeDir, '.claude', 'skills', 'skill-rules.json');
    if (!projectDir) return globalPath;
    const projectPath = join(projectDir, '.claude', 'skills', 'skill-rules.json');
    return existsSync(projectPath) ? projectPath : globalPath;
}

function buildOutput(matchedSkills) {
    const byPriority = priority => matchedSkills.filter(s => s.config.priority === priority);
    const critical = byPriority('critical');
    const high = byPriority('high');
    const medium = byPriority('medium');
    const low = byPriority('low');

    const line = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    let out = `${line}\n🎯 SKILL ACTIVATION CHECK\n${line}\n\n`;

    if (critical.length > 0) {
        out += '⚠️ CRITICAL SKILLS (REQUIRED):\n';
        critical.forEach(s => { out += `  → ${s.name}\n`; });
        out += '\n';
    }
    if (high.length > 0) {
        out += '📚 RECOMMENDED SKILLS:\n';
        high.forEach(s => { out += `  → ${s.name}\n`; });
        out += '\n';
    }
    if (medium.length > 0) {
        out += '💡 SUGGESTED SKILLS:\n';
        medium.forEach(s => { out += `  → ${s.name}\n`; });
        out += '\n';
    }
    if (low.length > 0) {
        out += '📌 OPTIONAL SKILLS:\n';
        low.forEach(s => { out += `  → ${s.name}\n`; });
        out += '\n';
    }

    out += `ACTION: Use Skill tool BEFORE responding\n${line}\n`;
    return out;
}

try {
    const data = JSON.parse(readFileSync(0, 'utf-8'));
    const prompt = data.prompt.toLowerCase();

    const homeDir = process.env.HOME || process.env.USERPROFILE || '/root';
    const rulesPath = resolveRulesPath(process.env.CLAUDE_PROJECT_DIR, homeDir);
    const rules = loadRules(rulesPath);

    const matchedSkills = [];

    for (const [skillName, config] of Object.entries(rules.skills)) {
        const triggers = config.promptTriggers;
        if (!triggers) continue;

        if (triggers.keywords?.some(kw => prompt.includes(kw.toLowerCase()))) {
            matchedSkills.push({ name: skillName, config });
            continue;
        }

        if (triggers.intentPatterns) {
            const patterns = getCompiledPatterns(skillName, triggers.intentPatterns);
            if (patterns.some(re => re.test(prompt))) {
                matchedSkills.push({ name: skillName, config });
            }
        }
    }

    if (matchedSkills.length > 0) {
        console.log(buildOutput(matchedSkills));
    }

    process.exit(0);
} catch (err) {
    console.error('Error in skill-activation-prompt hook:', err);
    process.exit(1);
}
