/**
 * Tests for SkillRegistry class.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SkillRegistry } from './skill-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SkillRegistry', () => {
    beforeEach(() => {
        //reset singleton before each test
        SkillRegistry.reset();
    });

    afterEach(() => {
        //cleanup after each test
        SkillRegistry.reset();
    });

    it('should return the same instance (singleton pattern)', () => {
        const instance1 = SkillRegistry.getInstance();
        const instance2 = SkillRegistry.getInstance();

        expect(instance1).toBe(instance2);
    });

    it('should start with no skills loaded', () => {
        const registry = SkillRegistry.getInstance();

        expect(registry.isLoaded()).toBe(false);
        expect(registry.getAllSkills()).toHaveLength(0);
    });

    it('should configure and load skills', async () => {
        const registry = SkillRegistry.getInstance();
        const skillsDir = path.resolve(__dirname, '../../skills');

        registry.configure({
            bundledSkillsDir: skillsDir,
        });

        await registry.loadSkills();

        expect(registry.isLoaded()).toBe(true);
        expect(registry.getAllSkills().length).toBeGreaterThan(0);
    });

    it('should retrieve a specific skill by name', async () => {
        const registry = SkillRegistry.getInstance();
        const skillsDir = path.resolve(__dirname, '../../skills');

        registry.configure({
            bundledSkillsDir: skillsDir,
        });

        await registry.loadSkills();

        const githubSkill = registry.getSkill('github');
        expect(githubSkill).toBeDefined();
        expect(githubSkill?.skill.name).toBe('github');
    });

    it('should return undefined for non-existent skill', async () => {
        const registry = SkillRegistry.getInstance();
        const skillsDir = path.resolve(__dirname, '../../skills');

        registry.configure({
            bundledSkillsDir: skillsDir,
        });

        await registry.loadSkills();

        const nonExistent = registry.getSkill('non-existent-skill');
        expect(nonExistent).toBeUndefined();
    });

    it('should get all skills', async () => {
        const registry = SkillRegistry.getInstance();
        const skillsDir = path.resolve(__dirname, '../../skills');

        registry.configure({
            bundledSkillsDir: skillsDir,
        });

        await registry.loadSkills();

        const allSkills = registry.getAllSkills();
        expect(Array.isArray(allSkills)).toBe(true);
        expect(allSkills.length).toBeGreaterThan(40); //we have 54 skills
    });

    it('should format skills for prompt', async () => {
        const registry = SkillRegistry.getInstance();
        const skillsDir = path.resolve(__dirname, '../../skills');

        registry.configure({
            bundledSkillsDir: skillsDir,
        });

        await registry.loadSkills();

        const prompt = registry.formatSkillsForPrompt();
        expect(prompt).toContain('# Available Skills');
        expect(prompt).toContain('github');
    });

    it('should reload skills when loadSkills is called multiple times', async () => {
        const registry = SkillRegistry.getInstance();
        const skillsDir = path.resolve(__dirname, '../../skills');

        registry.configure({
            bundledSkillsDir: skillsDir,
        });

        await registry.loadSkills();
        const firstCount = registry.getAllSkills().length;

        await registry.loadSkills();
        const secondCount = registry.getAllSkills().length;

        //should have same count after reload
        expect(firstCount).toBe(secondCount);
    });

    it('should filter skills by platform eligibility', async () => {
        const registry = SkillRegistry.getInstance();
        const skillsDir = path.resolve(__dirname, '../../skills');

        registry.configure({
            bundledSkillsDir: skillsDir,
        });

        await registry.loadSkills();

        //get skills eligible for a remote darwin platform
        const eligibleSkills = registry.getEligibleSkills({
            remote: {
                platforms: ['darwin'],
                hasBin: (bin: string) => bin === 'gh' || bin === 'curl',
                hasAnyBin: (bins: string[]) => bins.some((b) => b === 'gh' || b === 'curl'),
            },
        });

        //should have some eligible skills
        expect(eligibleSkills.length).toBeGreaterThan(0);
        //should be fewer than total skills (some are filtered out)
        expect(eligibleSkills.length).toBeLessThanOrEqual(registry.getAllSkills().length);
    });

    it('should return all skills when no eligibility context provided', async () => {
        const registry = SkillRegistry.getInstance();
        const skillsDir = path.resolve(__dirname, '../../skills');

        registry.configure({
            bundledSkillsDir: skillsDir,
        });

        await registry.loadSkills();

        const allSkills = registry.getAllSkills();
        const eligibleSkills = registry.getEligibleSkills();

        expect(eligibleSkills.length).toBe(allSkills.length);
    });
});
