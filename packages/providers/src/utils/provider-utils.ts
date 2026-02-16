/**
 * Utility functions for provider-specific logic and capabilities.
 * Ported from moltbot for i-clavdivs.
 */

/**
 * Returns true if the provider requires reasoning to be wrapped in tags
 * (e.g. <think> and <final>) in the text stream, rather than using native
 * API fields for reasoning/thinking.
 */
export function isReasoningTagProvider(provider: string | undefined | null): boolean {
    if (!provider) {
        return false;
    }
    const normalized = provider.trim().toLowerCase();

    //check for exact matches or known prefixes/substrings for reasoning providers
    if (
        normalized === 'ollama' ||
        normalized === 'google-gemini-cli' ||
        normalized === 'google-generative-ai'
    ) {
        return true;
    }

    //handle google-antigravity and its model variations (e.g. google-antigravity/gemini-3)
    if (normalized.includes('google-antigravity')) {
        return true;
    }

    //handle Minimax (M2.1 is chatty/reasoning-like)
    if (normalized.includes('minimax')) {
        return true;
    }

    return false;
}
