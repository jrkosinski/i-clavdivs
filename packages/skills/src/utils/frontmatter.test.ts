/**
 * Tests for frontmatter parsing utilities.
 */

import { describe, it, expect } from 'vitest';
import { parseFrontmatterBlock } from './frontmatter.js';

describe('frontmatter parsing', () => {
    it('should return empty object for content without frontmatter', () => {
        const content = 'Just regular markdown content';
        const result = parseFrontmatterBlock(content);

        expect(result).toEqual({});
    });

    it('should return empty object for malformed frontmatter (no closing delimiter)', () => {
        const content = `---
name: test
description: test`;
        const result = parseFrontmatterBlock(content);

        expect(result).toEqual({});
    });

    it('should parse simple key-value frontmatter', () => {
        const content = `---
name: test-skill
description: A test skill
---

# Content`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('test-skill');
        expect(result.description).toBe('A test skill');
    });

    it('should parse YAML frontmatter', () => {
        const content = `---
name: github
description: "GitHub CLI skill"
homepage: https://github.com
---

# GitHub`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('github');
        expect(result.description).toBe('GitHub CLI skill');
        expect(result.homepage).toBe('https://github.com');
    });

    it('should handle quoted values', () => {
        const content = `---
name: "quoted-name"
description: 'single-quoted'
unquoted: value
---`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('quoted-name');
        expect(result.description).toBe('single-quoted');
        expect(result.unquoted).toBe('value');
    });

    it('should parse multi-line values', () => {
        const content = `---
name: test
metadata:
  {"i-clavdivs": {"emoji": "🔧"}}
---`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('test');
        expect(result.metadata).toContain('i-clavdivs');
    });

    it('should handle empty values', () => {
        const content = `---
name: test
empty:
another: value
---`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('test');
        expect(result.another).toBe('value');
        //empty values might not be included
    });

    it('should handle Windows line endings (CRLF)', () => {
        const content = `---\r\nname: test\r\ndescription: windows\r\n---\r\n\r\nContent`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('test');
        expect(result.description).toBe('windows');
    });

    it('should handle mixed line endings', () => {
        const content = `---\rname: test\r\ndescription: mixed\n---\n\nContent`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('test');
        expect(result.description).toBe('mixed');
    });

    it('should parse JSON objects in frontmatter', () => {
        const content = `---
name: test
metadata: {"i-clavdivs": {"emoji": "🎯", "requires": {"bins": ["curl"]}}}
---`;

        const result = parseFrontmatterBlock(content);

        expect(result.metadata).toBeDefined();
        expect(result.metadata).toContain('i-clavdivs');
        expect(result.metadata).toContain('emoji');
    });

    it('should parse arrays in frontmatter', () => {
        const content = `---
name: test
tags: ["skill", "cli", "utility"]
---`;

        const result = parseFrontmatterBlock(content);

        expect(result.tags).toBeDefined();
        expect(result.tags).toContain('skill');
    });

    it('should handle complex nested YAML', () => {
        const content = `---
name: complex
nested:
  key1: value1
  key2: value2
  deep:
    level: 3
---`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('complex');
        //nested values get JSON stringified
        expect(result.nested).toBeDefined();
    });

    it('should ignore content after frontmatter', () => {
        const content = `---
name: test
---

# This is markdown content
with multiple lines
and should not be parsed as frontmatter`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('test');
        expect(Object.keys(result)).toHaveLength(1);
    });

    it('should handle frontmatter with special characters', () => {
        const content = `---
name: test-skill-123
description: Test with special chars: @#$%
url: https://example.com/path?query=value&other=true
---`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('test-skill-123');
        expect(result.description).toContain('@#$%');
        expect(result.url).toContain('query=value');
    });

    it('should handle boolean values in YAML', () => {
        const content = `---
name: test
enabled: true
disabled: false
---`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('test');
        expect(result.enabled).toBe('true');
        expect(result.disabled).toBe('false');
    });

    it('should handle numeric values in YAML', () => {
        const content = `---
name: test
port: 8080
version: 1.5
---`;

        const result = parseFrontmatterBlock(content);

        expect(result.name).toBe('test');
        expect(result.port).toBe('8080');
        expect(result.version).toBe('1.5');
    });

    it('should handle keys with hyphens', () => {
        const content = `---
skill-name: hyphenated
user-invocable: true
disable-model-invocation: false
---`;

        const result = parseFrontmatterBlock(content);

        expect(result['skill-name']).toBe('hyphenated');
        expect(result['user-invocable']).toBe('true');
        expect(result['disable-model-invocation']).toBe('false');
    });

    it('should handle empty frontmatter block', () => {
        const content = `---
---

Content`;

        const result = parseFrontmatterBlock(content);

        expect(result).toEqual({});
    });

    it('should prefer JSON values from line parser when present', () => {
        const content = `---
name: test
metadata: {"i-clavdivs": {"emoji": "🔧"}}
---`;

        const result = parseFrontmatterBlock(content);

        //metadata should be preserved as JSON string, not parsed as YAML
        expect(result.metadata).toContain('{');
        expect(result.metadata).toContain('i-clavdivs');
    });
});
