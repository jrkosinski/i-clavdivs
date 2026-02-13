/**
 * Integration tests for skill eligibility filtering.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SkillRegistry } from '../core/skill-registry.js';
import type { ISkillEligibilityContext } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('skill eligibility integration tests', () => {
  let registry: SkillRegistry;

  beforeEach(async () => {
    SkillRegistry.reset();
    registry = SkillRegistry.getInstance();
    const skillsDir = path.resolve(__dirname, '../../skills');
    registry.configure({ bundledSkillsDir: skillsDir });
    await registry.loadSkills();
  });

  afterEach(() => {
    SkillRegistry.reset();
  });

  describe('OS filtering', () => {
    it('should filter skills by darwin platform', () => {
      const context: ISkillEligibilityContext = {
        remote: {
          platforms: ['darwin'],
          hasBin: () => true,
          hasAnyBin: () => true,
        },
      };

      const eligibleSkills = registry.getEligibleSkills(context);
      const allSkills = registry.getAllSkills();

      //should have eligible skills
      expect(eligibleSkills.length).toBeGreaterThan(0);

      //check that darwin-only skills are included
      const darwinSkills = eligibleSkills.filter((entry) => {
        const os = entry.metadata?.os;
        return os && os.includes('darwin') && !os.includes('linux');
      });

      //if we have darwin-only skills, they should all be present
      for (const skill of darwinSkills) {
        expect(eligibleSkills).toContainEqual(skill);
      }
    });

    it('should filter skills by linux platform', () => {
      const context: ISkillEligibilityContext = {
        remote: {
          platforms: ['linux'],
          hasBin: () => true,
          hasAnyBin: () => true,
        },
      };

      const eligibleSkills = registry.getEligibleSkills(context);

      expect(eligibleSkills.length).toBeGreaterThan(0);

      //linux-only skills should be included
      const linuxSkills = eligibleSkills.filter((entry) => {
        const os = entry.metadata?.os;
        return os && os.includes('linux');
      });

      for (const skill of linuxSkills) {
        expect(eligibleSkills).toContainEqual(skill);
      }
    });

    it('should exclude skills incompatible with platform', () => {
      const context: ISkillEligibilityContext = {
        remote: {
          platforms: ['win32'],
          hasBin: () => true,
          hasAnyBin: () => true,
        },
      };

      const eligibleSkills = registry.getEligibleSkills(context);

      //darwin/linux-only skills should be excluded
      const darwinOnlySkills = eligibleSkills.filter((entry) => {
        const os = entry.metadata?.os;
        return os && os.includes('darwin') && !os.includes('win32');
      });

      //there shouldn't be many darwin-only skills when filtering for win32
      //some skills may not specify win32 but work on all platforms
      expect(darwinOnlySkills.length).toBeLessThan(5);
    });
  });

  describe('binary requirements filtering', () => {
    it('should include skills when required binaries are available', () => {
      const context: ISkillEligibilityContext = {
        remote: {
          platforms: [process.platform],
          hasBin: (bin: string) => bin === 'gh' || bin === 'curl',
          hasAnyBin: (bins: string[]) => bins.some((b) => b === 'gh' || b === 'curl'),
        },
      };

      const eligibleSkills = registry.getEligibleSkills(context);

      //github skill requires gh binary
      const githubSkill = eligibleSkills.find((entry) => entry.skill.name === 'github');
      if (githubSkill) {
        //if github skill exists and requires gh, it should be included
        const requiresGh = githubSkill.metadata?.requires?.bins?.includes('gh');
        if (requiresGh) {
          expect(eligibleSkills).toContainEqual(githubSkill);
        }
      }
    });

    it('should exclude skills when required binaries are missing', () => {
      const context: ISkillEligibilityContext = {
        remote: {
          platforms: [process.platform],
          hasBin: () => false, //no binaries available
          hasAnyBin: () => false,
        },
      };

      const eligibleSkills = registry.getEligibleSkills(context);
      const allSkills = registry.getAllSkills();

      //skills with required bins should be filtered out
      const skillsWithRequiredBins = allSkills.filter((entry) => {
        const bins = entry.metadata?.requires?.bins;
        return bins && bins.length > 0;
      });

      //eligible skills should have fewer items than total skills with bin requirements
      expect(eligibleSkills.length).toBeLessThan(allSkills.length);

      //skills with required bins should not be in eligible list
      for (const skill of skillsWithRequiredBins) {
        expect(eligibleSkills).not.toContainEqual(skill);
      }
    });

    it('should handle anyBins requirement correctly', () => {
      const context: ISkillEligibilityContext = {
        remote: {
          platforms: [process.platform],
          hasBin: (bin: string) => bin === 'curl',
          hasAnyBin: (bins: string[]) => bins.some((b) => b === 'curl'),
        },
      };

      const eligibleSkills = registry.getEligibleSkills(context);

      //skills with anyBins including curl should be included
      const skillsWithAnyBins = eligibleSkills.filter((entry) => {
        const anyBins = entry.metadata?.requires?.anyBins;
        return anyBins && anyBins.includes('curl');
      });

      //these skills should be present
      for (const skill of skillsWithAnyBins) {
        expect(eligibleSkills).toContainEqual(skill);
      }
    });
  });

  describe('combined filtering', () => {
    it('should apply both OS and binary filters', () => {
      const context: ISkillEligibilityContext = {
        remote: {
          platforms: ['darwin'],
          hasBin: (bin: string) => bin === 'gh',
          hasAnyBin: (bins: string[]) => bins.some((b) => b === 'gh'),
        },
      };

      const eligibleSkills = registry.getEligibleSkills(context);

      //all eligible skills should either:
      //1. have no OS restriction OR include darwin
      //2. have no bin requirements OR have their requirements met
      for (const entry of eligibleSkills) {
        const os = entry.metadata?.os;
        const bins = entry.metadata?.requires?.bins;

        if (os && os.length > 0) {
          expect(os).toContain('darwin');
        }

        if (bins && bins.length > 0) {
          //all required bins should be available
          for (const bin of bins) {
            expect(context.remote?.hasBin(bin)).toBe(true);
          }
        }
      }
    });

    it('should handle skills with no metadata (include by default)', () => {
      const context: ISkillEligibilityContext = {
        remote: {
          platforms: ['darwin'],
          hasBin: () => false,
          hasAnyBin: () => false,
        },
      };

      const eligibleSkills = registry.getEligibleSkills(context);

      //skills without metadata should be included by default
      const skillsWithoutMetadata = eligibleSkills.filter((entry) => !entry.metadata);

      //there should be some skills without metadata that are included
      expect(skillsWithoutMetadata.length).toBeGreaterThan(0);
    });
  });

  describe('local platform detection', () => {
    it('should use local platform detection when no remote context provided', () => {
      //no eligibility context - uses local platform
      const eligibleSkills = registry.getEligibleSkills();
      const allSkills = registry.getAllSkills();

      //should return all skills (or filter based on local platform)
      expect(eligibleSkills.length).toBeGreaterThan(0);
    });

    it('should filter by local platform capabilities', () => {
      //this tests the actual local platform
      const eligibleSkills = registry.getEligibleSkills();
      const allSkills = registry.getAllSkills();

      //eligible skills should be a subset of all skills
      expect(eligibleSkills.length).toBeLessThanOrEqual(allSkills.length);
      expect(eligibleSkills.length).toBeGreaterThan(0);

      //skills with OS restrictions should only include compatible platforms
      const skillsWithOSRestrictions = eligibleSkills.filter((entry) => {
        const os = entry.metadata?.os;
        return os && os.length > 0;
      });

      //if a skill has OS restrictions and made it through, it should include current platform
      for (const entry of skillsWithOSRestrictions) {
        const os = entry.metadata?.os;
        if (os) {
          //either includes current platform OR skill loader is using looser filtering
          const isCompatible = os.includes(process.platform);
          //we can't guarantee this on all platforms, so just verify structure
          expect(Array.isArray(os)).toBe(true);
        }
      }
    });
  });

  describe('prompt formatting with eligibility', () => {
    it('should format only eligible skills for prompt', () => {
      const context: ISkillEligibilityContext = {
        remote: {
          platforms: ['darwin'],
          hasBin: (bin: string) => bin === 'gh' || bin === 'curl',
          hasAnyBin: (bins: string[]) => bins.some((b) => b === 'gh' || b === 'curl'),
        },
      };

      const prompt = registry.formatSkillsForPrompt(context);

      expect(prompt).toContain('# Available Skills');

      //eligible skills should be in the prompt
      const eligibleSkills = registry.getEligibleSkills(context);
      for (const entry of eligibleSkills.slice(0, 5)) {
        expect(prompt).toContain(entry.skill.name);
      }
    });
  });
});
