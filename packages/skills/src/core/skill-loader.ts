/**
 * Skill loading utilities for reading SKILL.md files from directories.
 * Adapted from OpenClaw/moltbot skill loading system.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ISkill, ISkillEntry } from '../types/index.js';
import { parseFrontmatterBlock } from '../utils/frontmatter.js';
import { resolveSkillMetadata, resolveSkillInvocationPolicy } from '../utils/metadata.js';

const fsp = fs.promises;

/**
 * Loads skills from a directory containing SKILL.md files.
 * Each subdirectory should contain a SKILL.md file defining the skill.
 *
 * @param dirPath - Path to directory containing skill subdirectories
 * @param source - Source identifier for loaded skills (default: 'local')
 * @returns Array of loaded skill entries
 */
export async function loadSkillsFromDir(
  dirPath: string,
  source: string = 'local'
): Promise<ISkillEntry[]> {
  const entries: ISkillEntry[] = [];

  try {
    const dirEntries = await fsp.readdir(dirPath, { withFileTypes: true });

    for (const dirEntry of dirEntries) {
      if (!dirEntry.isDirectory()) {
        continue;
      }

      const skillDir = path.join(dirPath, dirEntry.name);
      const skillFilePath = path.join(skillDir, 'SKILL.md');

      //check if SKILL.md exists
      try {
        await fsp.access(skillFilePath);
      } catch {
        //no SKILL.md in this directory, skip
        continue;
      }

      //read skill content
      const content = await fsp.readFile(skillFilePath, 'utf-8');
      const frontmatter = parseFrontmatterBlock(content);

      //extract name and description from frontmatter
      const name = frontmatter.name ?? dirEntry.name;
      const description = frontmatter.description ?? '';

      //create skill object
      const skill: ISkill = {
        name,
        description,
        content,
        source,
      };

      //parse metadata and invocation policy
      const metadata = resolveSkillMetadata(frontmatter);
      const invocation = resolveSkillInvocationPolicy(frontmatter);

      //add metadata to skill if present
      if (metadata) {
        skill.metadata = metadata;
      }

      entries.push({
        skill,
        frontmatter,
        metadata,
        invocation,
      });
    }
  } catch (error) {
    //if directory doesn't exist or can't be read, return empty array
    return [];
  }

  return entries;
}

/**
 * Formats skills for inclusion in a prompt.
 * Generates a markdown string with skill documentation.
 *
 * @param skills - Array of skills to format
 * @returns Formatted markdown string
 */
export function formatSkillsForPrompt(skills: ISkill[]): string {
  if (skills.length === 0) {
    return '';
  }

  const sections = skills.map((skill) => {
    //extract just the content after frontmatter
    const contentWithoutFrontmatter = _removeFrontmatter(skill.content);
    return `## ${skill.name}\n\n${skill.description}\n\n${contentWithoutFrontmatter}`;
  });

  return `# Available Skills\n\n${sections.join('\n\n---\n\n')}`;
}

/**
 * Removes frontmatter block from markdown content.
 */
function _removeFrontmatter(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!normalized.startsWith('---')) {
    return content;
  }
  const endIndex = normalized.indexOf('\n---', 3);
  if (endIndex === -1) {
    return content;
  }
  //return content after the closing ---
  return normalized.slice(endIndex + 4).trim();
}
