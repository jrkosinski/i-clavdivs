/**
 * Metadata parsing utilities for skill frontmatter.
 * Adapted from OpenClaw/moltbot frontmatter processing.
 */

import JSON5 from 'json5';
import { parseBooleanValue } from '@i-clavdivs/common';
import type {
  ISkill,
  ISkillEntry,
  ISkillInstallSpec,
  ISkillInvocationPolicy,
  ISkillMetadata,
} from '../types/index.js';

//manifest key constants
const MANIFEST_KEY = 'openclaw';
const LEGACY_MANIFEST_KEYS = ['clawdbot', 'moltbot'];

/**
 * Normalizes input into a string array.
 */
function _normalizeStringList(input: unknown): string[] {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.map((value) => String(value).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Parses an install specification object from raw frontmatter data.
 */
function _parseInstallSpec(input: unknown): ISkillInstallSpec | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }
  const raw = input as Record<string, unknown>;
  const kindRaw =
    typeof raw.kind === 'string' ? raw.kind : typeof raw.type === 'string' ? raw.type : '';
  const kind = kindRaw.trim().toLowerCase();
  if (
    kind !== 'brew' &&
    kind !== 'node' &&
    kind !== 'go' &&
    kind !== 'uv' &&
    kind !== 'download' &&
    kind !== 'apt'
  ) {
    return undefined;
  }

  const spec: ISkillInstallSpec = {
    kind: kind as ISkillInstallSpec['kind'],
  };

  if (typeof raw.id === 'string') {
    spec.id = raw.id;
  }
  if (typeof raw.label === 'string') {
    spec.label = raw.label;
  }
  const bins = _normalizeStringList(raw.bins);
  if (bins.length > 0) {
    spec.bins = bins;
  }
  const osList = _normalizeStringList(raw.os);
  if (osList.length > 0) {
    spec.os = osList;
  }
  if (typeof raw.formula === 'string') {
    spec.formula = raw.formula;
  }
  if (typeof raw.package === 'string') {
    spec.package = raw.package;
  }
  if (typeof raw.module === 'string') {
    spec.module = raw.module;
  }
  if (typeof raw.url === 'string') {
    spec.url = raw.url;
  }
  if (typeof raw.archive === 'string') {
    spec.archive = raw.archive;
  }
  if (typeof raw.extract === 'boolean') {
    spec.extract = raw.extract;
  }
  if (typeof raw.stripComponents === 'number') {
    spec.stripComponents = raw.stripComponents;
  }
  if (typeof raw.targetDir === 'string') {
    spec.targetDir = raw.targetDir;
  }

  return spec;
}

/**
 * Gets a frontmatter value by key, returning undefined if not a string.
 */
function _getFrontmatterValue(
  frontmatter: Record<string, string>,
  key: string
): string | undefined {
  const raw = frontmatter[key];
  return typeof raw === 'string' ? raw : undefined;
}

/**
 * Parses a frontmatter boolean value with fallback.
 */
function _parseFrontmatterBool(value: string | undefined, fallback: boolean): boolean {
  const parsed = parseBooleanValue(value);
  return parsed === undefined ? fallback : parsed;
}

/**
 * Resolves skill metadata from frontmatter.
 *
 * @param frontmatter - Parsed frontmatter key-value pairs
 * @returns Parsed metadata object or undefined if invalid
 */
export function resolveSkillMetadata(
  frontmatter: Record<string, string>
): ISkillMetadata | undefined {
  const raw = _getFrontmatterValue(frontmatter, 'metadata');
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON5.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return undefined;
    }
    const metadataRawCandidates = [MANIFEST_KEY, ...LEGACY_MANIFEST_KEYS];
    let metadataRaw: unknown;
    for (const key of metadataRawCandidates) {
      const candidate = parsed[key];
      if (candidate && typeof candidate === 'object') {
        metadataRaw = candidate;
        break;
      }
    }
    if (!metadataRaw || typeof metadataRaw !== 'object') {
      return undefined;
    }
    const metadataObj = metadataRaw as Record<string, unknown>;
    const requiresRaw =
      typeof metadataObj.requires === 'object' && metadataObj.requires !== null
        ? (metadataObj.requires as Record<string, unknown>)
        : undefined;
    const installRaw = Array.isArray(metadataObj.install) ? (metadataObj.install as unknown[]) : [];
    const install = installRaw
      .map((entry) => _parseInstallSpec(entry))
      .filter((entry): entry is ISkillInstallSpec => Boolean(entry));
    const osRaw = _normalizeStringList(metadataObj.os);
    return {
      always: typeof metadataObj.always === 'boolean' ? metadataObj.always : undefined,
      emoji: typeof metadataObj.emoji === 'string' ? metadataObj.emoji : undefined,
      homepage: typeof metadataObj.homepage === 'string' ? metadataObj.homepage : undefined,
      skillKey: typeof metadataObj.skillKey === 'string' ? metadataObj.skillKey : undefined,
      primaryEnv: typeof metadataObj.primaryEnv === 'string' ? metadataObj.primaryEnv : undefined,
      os: osRaw.length > 0 ? osRaw : undefined,
      requires: requiresRaw
        ? {
            bins: _normalizeStringList(requiresRaw.bins),
            anyBins: _normalizeStringList(requiresRaw.anyBins),
            env: _normalizeStringList(requiresRaw.env),
            config: _normalizeStringList(requiresRaw.config),
          }
        : undefined,
      install: install.length > 0 ? install : undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * Resolves invocation policy from frontmatter.
 *
 * @param frontmatter - Parsed frontmatter key-value pairs
 * @returns Invocation policy with defaults applied
 */
export function resolveSkillInvocationPolicy(
  frontmatter: Record<string, string>
): ISkillInvocationPolicy {
  return {
    userInvocable: _parseFrontmatterBool(_getFrontmatterValue(frontmatter, 'user-invocable'), true),
    disableModelInvocation: _parseFrontmatterBool(
      _getFrontmatterValue(frontmatter, 'disable-model-invocation'),
      false
    ),
  };
}

/**
 * Resolves the unique key for a skill, preferring metadata.skillKey over skill.name.
 *
 * @param skill - The skill object
 * @param entry - Optional skill entry with metadata
 * @returns The resolved skill key
 */
export function resolveSkillKey(skill: ISkill, entry?: ISkillEntry): string {
  return entry?.metadata?.skillKey ?? skill.name;
}
