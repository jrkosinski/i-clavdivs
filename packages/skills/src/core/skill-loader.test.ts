/**
 * Tests for skill loader functionality.
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSkillsFromDir, formatSkillsForPrompt } from './skill-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('skill-loader', () => {
    it('should load skills from the bundled skills directory', async () => {
        const skillsDir = path.resolve(__dirname, '../../skills');
        const entries = await loadSkillsFromDir(skillsDir, 'test');

        //we should have loaded at least some skills
        expect(entries.length).toBeGreaterThan(0);

        //check that each entry has required properties
        for (const entry of entries) {
            expect(entry.skill).toBeDefined();
            expect(entry.skill.name).toBeTruthy();
            expect(entry.skill.content).toBeTruthy();
            expect(entry.frontmatter).toBeDefined();
        }
    });

    it('should parse frontmatter correctly for github skill', async () => {
        const skillsDir = path.resolve(__dirname, '../../skills');
        const entries = await loadSkillsFromDir(skillsDir, 'test');

        const githubEntry = entries.find((e) => e.skill.name === 'github');
        expect(githubEntry).toBeDefined();
        if (!githubEntry) {
            throw new Error('GitHub skill not found');
        }
        expect(githubEntry.skill.description).toBeTruthy();
        expect(githubEntry.metadata).toBeDefined();
        expect(githubEntry.metadata?.emoji).toBe('🐙');
    });

    it('should format skills for prompt', async () => {
        const skillsDir = path.resolve(__dirname, '../../skills');
        const entries = await loadSkillsFromDir(skillsDir, 'test');
        const skills = entries.slice(0, 3).map((e) => e.skill);

        const formatted = formatSkillsForPrompt(skills);

        expect(formatted).toContain('# Available Skills');
        if (skills[0]) {
            expect(formatted).toContain(skills[0].name);
        }
    });
});
