/**
 * Core types and interfaces for the skills system.
 * Adapted from OpenClaw/moltbot skill types.
 */

/**
 * Specification for installing a skill's dependencies.
 */
export interface ISkillInstallSpec {
  id?: string;
  kind: 'brew' | 'node' | 'go' | 'uv' | 'download' | 'apt';
  label?: string;
  bins?: string[];
  os?: string[];
  formula?: string;
  package?: string;
  module?: string;
  url?: string;
  archive?: string;
  extract?: boolean;
  stripComponents?: number;
  targetDir?: string;
}

/**
 * Requirements for a skill to be eligible.
 */
export interface ISkillRequirements {
  bins?: string[];
  anyBins?: string[];
  env?: string[];
  config?: string[];
}

/**
 * Metadata for a skill, typically parsed from SKILL.md frontmatter.
 */
export interface ISkillMetadata {
  always?: boolean;
  skillKey?: string;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  os?: string[];
  requires?: ISkillRequirements;
  install?: ISkillInstallSpec[];
}

/**
 * Core skill interface representing a capability or tool integration.
 */
export interface ISkill {
  name: string;
  description: string;
  content: string;
  source: string;
  metadata?: ISkillMetadata;
}

/**
 * Policy controlling how a skill can be invoked.
 */
export interface ISkillInvocationPolicy {
  userInvocable: boolean;
  disableModelInvocation: boolean;
}

/**
 * Entry combining a skill with its parsed frontmatter and metadata.
 */
export interface ISkillEntry {
  skill: ISkill;
  frontmatter: Record<string, string>;
  metadata?: ISkillMetadata;
  invocation?: ISkillInvocationPolicy;
}

/**
 * Context for determining skill eligibility on remote systems.
 */
export interface ISkillEligibilityContext {
  remote?: {
    platforms: string[];
    hasBin: (bin: string) => boolean;
    hasAnyBin: (bins: string[]) => boolean;
    note?: string;
  };
}

/**
 * Command specification for skill-based commands.
 */
export interface ISkillCommandSpec {
  name: string;
  skillName: string;
  description: string;
  dispatch?: {
    kind: 'tool';
    toolName: string;
    argMode?: 'raw';
  };
}

/**
 * Snapshot of skills for serialization/caching.
 */
export interface ISkillSnapshot {
  prompt: string;
  skills: Array<{ name: string; primaryEnv?: string }>;
  resolvedSkills?: ISkill[];
  version?: number;
}

/**
 * Configuration options for a specific skill.
 */
export interface ISkillConfig {
  enabled?: boolean;
  [key: string]: unknown;
}

/**
 * Installation preferences for skill dependencies.
 */
export interface ISkillsInstallPreferences {
  preferBrew: boolean;
  nodeManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
}
