/**
 * Frontmatter parsing utilities for YAML and key-value formats.
 * Adapted from OpenClaw/moltbot markdown frontmatter parser.
 */

import YAML from 'yaml';

export type IParsedFrontmatter = Record<string, string>;

/**
 * Removes surrounding quotes from a string if present.
 */
function _stripQuotes(value: string): string {
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        return value.slice(1, -1);
    }
    return value;
}

/**
 * Coerces various types of frontmatter values into strings.
 */
function _coerceFrontmatterValue(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === 'string') {
        return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return undefined;
        }
    }
    return undefined;
}

/**
 * Parses a YAML frontmatter block into a key-value record.
 */
function _parseYamlFrontmatter(block: string): IParsedFrontmatter | null {
    try {
        const parsed = YAML.parse(block) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }
        const result: IParsedFrontmatter = {};
        for (const [rawKey, value] of Object.entries(parsed as Record<string, unknown>)) {
            const key = rawKey.trim();
            if (!key) {
                continue;
            }
            const coerced = _coerceFrontmatterValue(value);
            if (coerced === undefined) {
                continue;
            }
            result[key] = coerced;
        }
        return result;
    } catch {
        return null;
    }
}

/**
 * Extracts a multi-line value from frontmatter lines.
 */
function _extractMultiLineValue(
    lines: string[],
    startIndex: number
): { value: string; linesConsumed: number } {
    const startLine = lines[startIndex];
    if (!startLine) {
        return { value: '', linesConsumed: 1 };
    }
    const match = startLine.match(/^([\w-]+):\s*(.*)$/);
    if (!match) {
        return { value: '', linesConsumed: 1 };
    }

    const inlineValue = match[2]?.trim() ?? '';
    if (inlineValue) {
        return { value: inlineValue, linesConsumed: 1 };
    }

    const valueLines: string[] = [];
    let i = startIndex + 1;

    while (i < lines.length) {
        const line = lines[i];
        if (!line || (line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t'))) {
            break;
        }
        valueLines.push(line);
        i++;
    }

    const combined = valueLines.join('\n').trim();
    return { value: combined, linesConsumed: i - startIndex };
}

/**
 * Parses simple line-based frontmatter (key: value format).
 */
function _parseLineFrontmatter(block: string): IParsedFrontmatter {
    const frontmatter: IParsedFrontmatter = {};
    const lines = block.split('\n');
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        if (!line) {
            i++;
            continue;
        }
        const match = line.match(/^([\w-]+):\s*(.*)$/);
        if (!match) {
            i++;
            continue;
        }

        const key = match[1];
        const inlineValue = match[2]?.trim() ?? '';

        if (!key) {
            i++;
            continue;
        }

        if (!inlineValue && i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            if (nextLine && (nextLine.startsWith(' ') || nextLine.startsWith('\t'))) {
                const { value, linesConsumed } = _extractMultiLineValue(lines, i);
                if (value) {
                    frontmatter[key] = value;
                }
                i += linesConsumed;
                continue;
            }
        }

        const value = _stripQuotes(inlineValue);
        if (value) {
            frontmatter[key] = value;
        }
        i++;
    }

    return frontmatter;
}

/**
 * Parses frontmatter from markdown content.
 * Supports both YAML and simple key-value formats within --- delimiters.
 *
 * @param content - The markdown content with frontmatter
 * @returns Parsed frontmatter as key-value record
 */
export function parseFrontmatterBlock(content: string): IParsedFrontmatter {
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!normalized.startsWith('---')) {
        return {};
    }
    const endIndex = normalized.indexOf('\n---', 3);
    if (endIndex === -1) {
        return {};
    }
    const block = normalized.slice(4, endIndex);

    const lineParsed = _parseLineFrontmatter(block);
    const yamlParsed = _parseYamlFrontmatter(block);
    if (yamlParsed === null) {
        return lineParsed;
    }

    //merge yaml and line-parsed results, preferring JSON/object values from line parser
    const merged: IParsedFrontmatter = { ...yamlParsed };
    for (const [key, value] of Object.entries(lineParsed)) {
        if (value.startsWith('{') || value.startsWith('[')) {
            merged[key] = value;
        }
    }
    return merged;
}
