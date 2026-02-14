/**
 * Channel matching and resolution utilities.
 *
 * Provides utilities for matching channel configurations based on
 * various keys, wildcards, and parent relationships.
 */

/**
 * Source of a channel configuration match.
 */
export type ChannelMatchSource = 'direct' | 'parent' | 'wildcard';

/**
 * Result of a channel entry match operation.
 */
export interface IChannelEntryMatch<T> {
    /**
     * Directly matched entry.
     */
    entry?: T;

    /**
     * Key used for direct match.
     */
    key?: string;

    /**
     * Wildcard-matched entry.
     */
    wildcardEntry?: T;

    /**
     * Wildcard key used.
     */
    wildcardKey?: string;

    /**
     * Parent-matched entry.
     */
    parentEntry?: T;

    /**
     * Parent key used.
     */
    parentKey?: string;

    /**
     * The final matched key.
     */
    matchKey?: string;

    /**
     * Source type of the match.
     */
    matchSource?: ChannelMatchSource;
}

/**
 * Applies match metadata to a result object.
 *
 * @param result - The result object to enhance
 * @param match - The match information
 * @returns The enhanced result object
 */
export function applyMatchMetadata<
    TResult extends { matchKey?: string; matchSource?: ChannelMatchSource },
>(result: TResult, match: IChannelEntryMatch<unknown>): TResult {
    if (match.matchKey && match.matchSource) {
        result.matchKey = match.matchKey;
        result.matchSource = match.matchSource;
    }
    return result;
}

/**
 * Resolves a configuration from a channel match.
 *
 * @param match - The channel entry match
 * @param resolveEntry - Function to transform entry to result
 * @returns Resolved result or null if no entry matched
 */
export function resolveMatchedConfig<
    TEntry,
    TResult extends { matchKey?: string; matchSource?: ChannelMatchSource },
>(match: IChannelEntryMatch<TEntry>, resolveEntry: (entry: TEntry) => TResult): TResult | null {
    if (!match.entry) {
        return null;
    }
    return applyMatchMetadata(resolveEntry(match.entry), match);
}

/**
 * Normalizes a channel slug by removing special characters.
 *
 * @param value - The raw channel slug
 * @returns Normalized slug string
 */
export function normalizeChannelSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/^#/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Builds a list of unique channel key candidates.
 *
 * @param keys - Variable number of potential keys
 * @returns Array of unique, non-empty keys
 */
export function buildChannelKeyCandidates(...keys: Array<string | undefined | null>): string[] {
    const seen = new Set<string>();
    const candidates: string[] = [];

    for (const key of keys) {
        if (typeof key !== 'string') {
            continue;
        }

        const trimmed = key.trim();
        if (!trimmed || seen.has(trimmed)) {
            continue;
        }

        seen.add(trimmed);
        candidates.push(trimmed);
    }

    return candidates;
}

/**
 * Resolves a channel entry match from a record.
 *
 * @param params - Match parameters
 * @returns Match result with entry and key information
 */
export function resolveChannelEntryMatch<T>(params: {
    entries?: Record<string, T>;
    keys: string[];
    wildcardKey?: string;
}): IChannelEntryMatch<T> {
    const entries = params.entries ?? {};
    const match: IChannelEntryMatch<T> = {};

    //try to find direct match
    for (const key of params.keys) {
        if (!Object.prototype.hasOwnProperty.call(entries, key)) {
            continue;
        }
        match.entry = entries[key];
        match.key = key;
        break;
    }

    //check for wildcard match
    if (params.wildcardKey && Object.prototype.hasOwnProperty.call(entries, params.wildcardKey)) {
        match.wildcardEntry = entries[params.wildcardKey];
        match.wildcardKey = params.wildcardKey;
    }

    return match;
}

/**
 * Resolves a channel entry match with fallback to parent and wildcard.
 *
 * @param params - Extended match parameters
 * @returns Match result with fallback logic applied
 */
export function resolveChannelEntryMatchWithFallback<T>(params: {
    entries?: Record<string, T>;
    keys: string[];
    parentKeys?: string[];
    wildcardKey?: string;
    normalizeKey?: (value: string) => string;
}): IChannelEntryMatch<T> {
    const direct = resolveChannelEntryMatch({
        entries: params.entries,
        keys: params.keys,
        wildcardKey: params.wildcardKey,
    });

    //if we have a direct match, return it
    if (direct.entry && direct.key) {
        return { ...direct, matchKey: direct.key, matchSource: 'direct' };
    }

    //try normalized keys if normalizer provided
    const normalizeKey = params.normalizeKey;
    if (normalizeKey) {
        const normalizedKeys = params.keys.map((key) => normalizeKey(key)).filter(Boolean);
        if (normalizedKeys.length > 0) {
            for (const [entryKey, entry] of Object.entries(params.entries ?? {})) {
                const normalizedEntry = normalizeKey(entryKey);
                if (normalizedEntry && normalizedKeys.includes(normalizedEntry)) {
                    return {
                        ...direct,
                        entry,
                        key: entryKey,
                        matchKey: entryKey,
                        matchSource: 'direct',
                    };
                }
            }
        }
    }

    //try parent keys
    const parentKeys = params.parentKeys ?? [];
    if (parentKeys.length > 0) {
        const parent = resolveChannelEntryMatch({
            entries: params.entries,
            keys: parentKeys,
        });

        if (parent.entry && parent.key) {
            return {
                ...direct,
                entry: parent.entry,
                key: parent.key,
                parentEntry: parent.entry,
                parentKey: parent.key,
                matchKey: parent.key,
                matchSource: 'parent',
            };
        }

        //try normalized parent keys
        if (normalizeKey) {
            const normalizedParentKeys = parentKeys.map((key) => normalizeKey(key)).filter(Boolean);
            if (normalizedParentKeys.length > 0) {
                for (const [entryKey, entry] of Object.entries(params.entries ?? {})) {
                    const normalizedEntry = normalizeKey(entryKey);
                    if (normalizedEntry && normalizedParentKeys.includes(normalizedEntry)) {
                        return {
                            ...direct,
                            entry,
                            key: entryKey,
                            parentEntry: entry,
                            parentKey: entryKey,
                            matchKey: entryKey,
                            matchSource: 'parent',
                        };
                    }
                }
            }
        }
    }

    //fallback to wildcard
    if (direct.wildcardEntry && direct.wildcardKey) {
        return {
            ...direct,
            entry: direct.wildcardEntry,
            key: direct.wildcardKey,
            matchKey: direct.wildcardKey,
            matchSource: 'wildcard',
        };
    }

    return direct;
}

/**
 * Resolves nested allowlist decision based on outer and inner configuration.
 *
 * @param params - Allowlist configuration state
 * @returns True if access should be allowed
 */
export function resolveNestedAllowlistDecision(params: {
    outerConfigured: boolean;
    outerMatched: boolean;
    innerConfigured: boolean;
    innerMatched: boolean;
}): boolean {
    //if outer not configured, allow
    if (!params.outerConfigured) {
        return true;
    }

    //if outer configured but not matched, deny
    if (!params.outerMatched) {
        return false;
    }

    //if inner not configured, allow
    if (!params.innerConfigured) {
        return true;
    }

    //defer to inner match result
    return params.innerMatched;
}
