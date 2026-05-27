#!/usr/bin/env node
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode: string;
    prompt: string;
}

interface PromptTriggers {
    keywords?: string[];
    intentPatterns?: string[];
}

interface SkillRule {
    type: 'guardrail' | 'domain';
    enforcement: 'block' | 'suggest' | 'warn';
    priority: 'critical' | 'high' | 'medium' | 'low';
    promptTriggers?: PromptTriggers;
}

interface SkillRules {
    version: string;
    skills: Record<string, SkillRule>;
}

interface MatchedSkill {
    name: string;
    matchType: 'keyword' | 'intent';
    config: SkillRule;
}

// OPTIMIZATION: Cache for parsed rules
let cachedRules: SkillRules | null = null;
let cachedRulesTimestamp: number = 0;

// OPTIMIZATION: Pre-compiled regex patterns
const compiledPatterns: Map<string, RegExp[]> = new Map();

function loadRules(rulesPath: string): SkillRules {
    const stat = statSync(rulesPath);

    // Cache hit - no need to parse
    if (cachedRules && stat.mtimeMs === cachedRulesTimestamp) {
        return cachedRules;
    }

    // Cache miss - parse and cache
    cachedRules = JSON.parse(readFileSync(rulesPath, 'utf-8'));
    cachedRulesTimestamp = stat.mtimeMs;

    // Clear compiled patterns on rules reload
    compiledPatterns.clear();

    return cachedRules;
}

function getCompiledPatterns(skillName: string, patterns: string[]): RegExp[] {
    if (!compiledPatterns.has(skillName)) {
        compiledPatterns.set(skillName, patterns.map(p => new RegExp(p, 'i')));
    }
    return compiledPatterns.get(skillName)!;
}

async function main() {
    try {
        // Read input from stdin
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);
        const prompt = data.prompt.toLowerCase();

        // Load skill rules with caching - use dynamic home directory
        const homeDir = process.env.HOME || process.env.USERPROFILE || '/root';
        const globalSkillsPath = join(homeDir, '.claude', 'skills', 'skill-rules.json');
        const projectDir = process.env.CLAUDE_PROJECT_DIR;

        let rulesPath: string;
        if (projectDir) {
            const projectRulesPath = join(projectDir, '.claude', 'skills', 'skill-rules.json');
            const { existsSync } = await import('fs');
            rulesPath = existsSync(projectRulesPath) ? projectRulesPath : globalSkillsPath;
        } else {
            rulesPath = globalSkillsPath;
        }

        const rules: SkillRules = loadRules(rulesPath);
        const matchedSkills: MatchedSkill[] = [];

        // Check each skill for matches
        for (const [skillName, config] of Object.entries(rules.skills)) {
            const triggers = config.promptTriggers;
            if (!triggers) {
                continue;
            }

            // Keyword matching - early exit on match
            if (triggers.keywords) {
                const keywordMatch = triggers.keywords.some(kw =>
                    prompt.includes(kw.toLowerCase())
                );
                if (keywordMatch) {
                    matchedSkills.push({ name: skillName, matchType: 'keyword', config });
                    continue; // Skip intent matching if keyword matched
                }
            }

            // Intent pattern matching with compiled regex
            if (triggers.intentPatterns) {
                const patterns = getCompiledPatterns(skillName, triggers.intentPatterns);
                const intentMatch = patterns.some(regex => regex.test(prompt));
                if (intentMatch) {
                    matchedSkills.push({ name: skillName, matchType: 'intent', config });
                }
            }
        }

        // Generate output if matches found
        if (matchedSkills.length > 0) {
            let output = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            output += '🎯 SKILL ACTIVATION CHECK\n';
            output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

            // Group by priority
            const critical = matchedSkills.filter(s => s.config.priority === 'critical');
            const high = matchedSkills.filter(s => s.config.priority === 'high');
            const medium = matchedSkills.filter(s => s.config.priority === 'medium');
            const low = matchedSkills.filter(s => s.config.priority === 'low');

            if (critical.length > 0) {
                output += '⚠️ CRITICAL SKILLS (REQUIRED):\n';
                critical.forEach(s => output += `  → ${s.name}\n`);
                output += '\n';
            }

            if (high.length > 0) {
                output += '📚 RECOMMENDED SKILLS:\n';
                high.forEach(s => output += `  → ${s.name}\n`);
                output += '\n';
            }

            if (medium.length > 0) {
                output += '💡 SUGGESTED SKILLS:\n';
                medium.forEach(s => output += `  → ${s.name}\n`);
                output += '\n';
            }

            if (low.length > 0) {
                output += '📌 OPTIONAL SKILLS:\n';
                low.forEach(s => output += `  → ${s.name}\n`);
                output += '\n';
            }

            output += 'ACTION: Use Skill tool BEFORE responding\n';
            output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

            console.log(output);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error in skill-activation-prompt hook:', err);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Uncaught error:', err);
    process.exit(1);
});
