/**
 * Central registry for managing skills.
 * Provides singleton access to skills loaded from directories.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ISkillEntry, ISkillEligibilityContext } from '../types/index.js';
import { loadSkillsFromDir, formatSkillsForPrompt } from './skill-loader.js';
import { resolveSkillKey } from '../utils/metadata.js';

/**
 * Configuration options for the SkillRegistry.
 */
export interface ISkillRegistryConfig {
  bundledSkillsDir?: string;
  workspaceSkillsDir?: string;
  allowBundledSkills?: string[];
}

/**
 * Central registry for managing and accessing skills.
 * Implements singleton pattern for global access.
 */
export class SkillRegistry {
  private static _instance: SkillRegistry | null = null;

  private _skillEntries: Map<string, ISkillEntry> = new Map();
  private _config: ISkillRegistryConfig = {};
  private _loaded: boolean = false;

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {}

  /**
   * Gets the singleton instance of the SkillRegistry.
   */
  public static getInstance(): SkillRegistry {
    if (!SkillRegistry._instance) {
      SkillRegistry._instance = new SkillRegistry();
    }
    return SkillRegistry._instance;
  }

  /**
   * Configures the registry with skill directories.
   *
   * @param config - Configuration options
   */
  public configure(config: ISkillRegistryConfig): void {
    this._config = { ...this._config, ...config };
  }

  /**
   * Loads skills from configured directories.
   * Can be called multiple times to reload skills.
   */
  public async loadSkills(): Promise<void> {
    this._skillEntries.clear();

    //load bundled skills if configured
    if (this._config.bundledSkillsDir) {
      const bundledEntries = await loadSkillsFromDir(
        this._config.bundledSkillsDir,
        'bundled'
      );
      for (const entry of bundledEntries) {
        const key = resolveSkillKey(entry.skill, entry);
        this._skillEntries.set(key, entry);
      }
    }

    //load workspace skills if configured (overrides bundled)
    if (this._config.workspaceSkillsDir) {
      const workspaceEntries = await loadSkillsFromDir(
        this._config.workspaceSkillsDir,
        'workspace'
      );
      for (const entry of workspaceEntries) {
        const key = resolveSkillKey(entry.skill, entry);
        this._skillEntries.set(key, entry);
      }
    }

    this._loaded = true;
  }

  /**
   * Gets a skill by name or key.
   *
   * @param nameOrKey - Skill name or skill key
   * @returns Skill entry if found, undefined otherwise
   */
  public getSkill(nameOrKey: string): ISkillEntry | undefined {
    return this._skillEntries.get(nameOrKey);
  }

  /**
   * Gets all loaded skill entries.
   *
   * @returns Array of all skill entries
   */
  public getAllSkills(): ISkillEntry[] {
    return Array.from(this._skillEntries.values());
  }

  /**
   * Gets all skill entries filtered by eligibility context.
   *
   * @param eligibility - Optional eligibility context for filtering
   * @returns Array of eligible skill entries
   */
  public getEligibleSkills(eligibility?: ISkillEligibilityContext): ISkillEntry[] {
    const allSkills = this.getAllSkills();

    if (!eligibility) {
      return allSkills;
    }

    return allSkills.filter((entry) => this._isSkillEligible(entry, eligibility));
  }

  /**
   * Formats eligible skills for prompt injection.
   *
   * @param eligibility - Optional eligibility context
   * @returns Formatted markdown string
   */
  public formatSkillsForPrompt(eligibility?: ISkillEligibilityContext): string {
    const eligibleSkills = this.getEligibleSkills(eligibility);
    const skills = eligibleSkills.map((entry) => entry.skill);
    return formatSkillsForPrompt(skills);
  }

  /**
   * Checks if skills have been loaded.
   *
   * @returns True if skills are loaded
   */
  public isLoaded(): boolean {
    return this._loaded;
  }

  /**
   * Resets the registry singleton (primarily for testing).
   */
  public static reset(): void {
    SkillRegistry._instance = null;
  }

  /**
   * Checks if a skill entry is eligible based on context.
   */
  private _isSkillEligible(
    entry: ISkillEntry,
    eligibility: ISkillEligibilityContext
  ): boolean {
    const metadata = entry.metadata;
    if (!metadata) {
      return true;
    }

    //check OS compatibility
    if (metadata.os && metadata.os.length > 0) {
      const platform = process.platform;
      if (!metadata.os.includes(platform)) {
        return false;
      }
    }

    //check required binaries
    if (metadata.requires?.bins && metadata.requires.bins.length > 0) {
      for (const bin of metadata.requires.bins) {
        if (eligibility.remote) {
          if (!eligibility.remote.hasBin(bin)) {
            return false;
          }
        } else {
          if (!this._hasBinary(bin)) {
            return false;
          }
        }
      }
    }

    //check any-of binaries
    if (metadata.requires?.anyBins && metadata.requires.anyBins.length > 0) {
      const hasAny = eligibility.remote
        ? eligibility.remote.hasAnyBin(metadata.requires.anyBins)
        : metadata.requires.anyBins.some((bin) => this._hasBinary(bin));
      if (!hasAny) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if a binary is available in PATH.
   */
  private _hasBinary(bin: string): boolean {
    const pathEnv = process.env.PATH ?? '';
    const paths = pathEnv.split(path.delimiter);

    for (const dir of paths) {
      const binPath = path.join(dir, bin);
      try {
        fs.accessSync(binPath, fs.constants.X_OK);
        return true;
      } catch {
        //continue checking other paths
      }
    }

    return false;
  }
}
