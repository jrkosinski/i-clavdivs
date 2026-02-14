/**
 * Tests for metadata parsing utilities.
 */

import { describe, it, expect } from 'vitest';
import { resolveSkillMetadata, resolveSkillInvocationPolicy, resolveSkillKey } from './metadata.js';
import type { ISkill, ISkillEntry } from '../types/index.js';

describe('metadata utilities', () => {
    describe('resolveSkillMetadata', () => {
        it('should return undefined for empty frontmatter', () => {
            const frontmatter = {};
            const metadata = resolveSkillMetadata(frontmatter);
            expect(metadata).toBeUndefined();
        });

        it('should return undefined for frontmatter without metadata field', () => {
            const frontmatter = {
                name: 'test-skill',
                description: 'A test skill',
            };
            const metadata = resolveSkillMetadata(frontmatter);
            expect(metadata).toBeUndefined();
        });

        it('should parse valid metadata with i-clavdivs key', () => {
            const frontmatter = {
                metadata: '{"i-clavdivs": {"emoji": "🔧", "requires": {"bins": ["test"]}}}',
            };
            const metadata = resolveSkillMetadata(frontmatter);

            expect(metadata).toBeDefined();
            expect(metadata?.emoji).toBe('🔧');
            expect(metadata?.requires?.bins).toEqual(['test']);
        });

        it('should parse metadata with legacy clawdbot key', () => {
            const frontmatter = {
                metadata: '{"clawdbot": {"emoji": "🦞", "homepage": "https://example.com"}}',
            };
            const metadata = resolveSkillMetadata(frontmatter);

            expect(metadata).toBeDefined();
            expect(metadata?.emoji).toBe('🦞');
            expect(metadata?.homepage).toBe('https://example.com');
        });

        it('should parse install specifications', () => {
            const frontmatter = {
                metadata: `{
          "i-clavdivs": {
            "install": [
              {"kind": "brew", "formula": "gh", "bins": ["gh"]},
              {"kind": "apt", "package": "gh"}
            ]
          }
        }`,
            };
            const metadata = resolveSkillMetadata(frontmatter);

            expect(metadata?.install).toBeDefined();
            expect(metadata?.install).toHaveLength(2);
            expect(metadata?.install?.[0]?.kind).toBe('brew');
            expect(metadata?.install?.[0]?.formula).toBe('gh');
            expect(metadata?.install?.[1]?.kind).toBe('apt');
        });

        it('should parse OS requirements', () => {
            const frontmatter = {
                metadata: '{"i-clavdivs": {"os": ["darwin", "linux"]}}',
            };
            const metadata = resolveSkillMetadata(frontmatter);

            expect(metadata?.os).toEqual(['darwin', 'linux']);
        });

        it('should parse binary requirements', () => {
            const frontmatter = {
                metadata: `{
          "i-clavdivs": {
            "requires": {
              "bins": ["curl", "jq"],
              "anyBins": ["wget", "curl"],
              "env": ["API_KEY"],
              "config": ["github.token"]
            }
          }
        }`,
            };
            const metadata = resolveSkillMetadata(frontmatter);

            expect(metadata?.requires?.bins).toEqual(['curl', 'jq']);
            expect(metadata?.requires?.anyBins).toEqual(['wget', 'curl']);
            expect(metadata?.requires?.env).toEqual(['API_KEY']);
            expect(metadata?.requires?.config).toEqual(['github.token']);
        });

        it('should handle invalid JSON gracefully', () => {
            const frontmatter = {
                metadata: 'invalid json {',
            };
            const metadata = resolveSkillMetadata(frontmatter);

            expect(metadata).toBeUndefined();
        });

        it('should parse boolean flags', () => {
            const frontmatter = {
                metadata: '{"i-clavdivs": {"always": true}}',
            };
            const metadata = resolveSkillMetadata(frontmatter);

            expect(metadata?.always).toBe(true);
        });

        it('should parse skillKey and primaryEnv', () => {
            const frontmatter = {
                metadata: '{"i-clavdivs": {"skillKey": "custom-key", "primaryEnv": "NODE_ENV"}}',
            };
            const metadata = resolveSkillMetadata(frontmatter);

            expect(metadata?.skillKey).toBe('custom-key');
            expect(metadata?.primaryEnv).toBe('NODE_ENV');
        });
    });

    describe('resolveSkillInvocationPolicy', () => {
        it('should return default policy for empty frontmatter', () => {
            const frontmatter = {};
            const policy = resolveSkillInvocationPolicy(frontmatter);

            expect(policy.userInvocable).toBe(true);
            expect(policy.disableModelInvocation).toBe(false);
        });

        it('should parse user-invocable flag', () => {
            const frontmatter = {
                'user-invocable': 'false',
            };
            const policy = resolveSkillInvocationPolicy(frontmatter);

            expect(policy.userInvocable).toBe(false);
        });

        it('should parse disable-model-invocation flag', () => {
            const frontmatter = {
                'disable-model-invocation': 'true',
            };
            const policy = resolveSkillInvocationPolicy(frontmatter);

            expect(policy.disableModelInvocation).toBe(true);
        });

        it('should handle various truthy values', () => {
            const tests = [
                { value: 'true', expected: true },
                { value: '1', expected: true },
                { value: 'yes', expected: true },
                { value: 'on', expected: true },
            ];

            for (const test of tests) {
                const policy = resolveSkillInvocationPolicy({
                    'user-invocable': test.value,
                });
                expect(policy.userInvocable).toBe(test.expected);
            }
        });

        it('should handle various falsy values', () => {
            const tests = [
                { value: 'false', expected: false },
                { value: '0', expected: false },
                { value: 'no', expected: false },
                { value: 'off', expected: false },
            ];

            for (const test of tests) {
                const policy = resolveSkillInvocationPolicy({
                    'disable-model-invocation': test.value,
                });
                expect(policy.disableModelInvocation).toBe(test.expected);
            }
        });
    });

    describe('resolveSkillKey', () => {
        it('should return skill name when no entry provided', () => {
            const skill: ISkill = {
                name: 'test-skill',
                description: 'Test',
                content: '',
                source: 'test',
            };

            const key = resolveSkillKey(skill);
            expect(key).toBe('test-skill');
        });

        it('should return skill name when entry has no metadata', () => {
            const skill: ISkill = {
                name: 'test-skill',
                description: 'Test',
                content: '',
                source: 'test',
            };

            const entry: ISkillEntry = {
                skill,
                frontmatter: {},
            };

            const key = resolveSkillKey(skill, entry);
            expect(key).toBe('test-skill');
        });

        it('should return skillKey from metadata when present', () => {
            const skill: ISkill = {
                name: 'test-skill',
                description: 'Test',
                content: '',
                source: 'test',
            };

            const entry: ISkillEntry = {
                skill,
                frontmatter: {},
                metadata: {
                    skillKey: 'custom-key',
                },
            };

            const key = resolveSkillKey(skill, entry);
            expect(key).toBe('custom-key');
        });

        it('should prefer metadata skillKey over skill name', () => {
            const skill: ISkill = {
                name: 'original-name',
                description: 'Test',
                content: '',
                source: 'test',
            };

            const entry: ISkillEntry = {
                skill,
                frontmatter: {},
                metadata: {
                    skillKey: 'overridden-key',
                },
            };

            const key = resolveSkillKey(skill, entry);
            expect(key).toBe('overridden-key');
            expect(key).not.toBe(skill.name);
        });
    });
});
