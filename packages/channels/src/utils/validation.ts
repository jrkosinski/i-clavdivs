/**
 * Validation utilities for channel data.
 *
 * Provides validation functions for common channel-related data types.
 */

/**
 * Validates if a string is a valid phone number in E.164 format.
 *
 * @param value - The value to validate
 * @returns True if the value is a valid E.164 phone number
 */
export function isValidE164(value: string): boolean {
    //e.164 format: +[country code][subscriber number]
    //length: 1-15 digits after the +
    const pattern = /^\+[1-9]\d{1,14}$/;
    return pattern.test(value);
}

/**
 * Normalizes a phone number to E.164 format.
 *
 * @param value - The raw phone number
 * @returns Normalized E.164 number or null if invalid
 */
export function normalizeE164(value: string): string | null {
    //remove all non-digit characters except leading +
    let cleaned = value.trim();

    if (!cleaned) {
        return null;
    }

    //if it starts with +, keep it
    const hasPlus = cleaned.startsWith('+');
    cleaned = cleaned.replace(/[^\d]/g, '');

    //must have at least some digits
    if (cleaned.length === 0) {
        return null;
    }

    //add + if not present
    if (!hasPlus && cleaned.length > 0) {
        cleaned = '+' + cleaned;
    } else if (hasPlus) {
        cleaned = '+' + cleaned;
    }

    //validate
    if (isValidE164(cleaned)) {
        return cleaned;
    }

    return null;
}

/**
 * Validates if a string looks like a valid email address.
 *
 * @param value - The value to validate
 * @returns True if the value looks like an email
 */
export function isValidEmail(value: string): boolean {
    //basic email validation
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value);
}

/**
 * Validates if a string is a valid URL.
 *
 * @param value - The value to validate
 * @returns True if the value is a valid URL
 */
export function isValidUrl(value: string): boolean {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Sanitizes a string for safe display.
 *
 * @param value - The value to sanitize
 * @param maxLength - Maximum length (default: no limit)
 * @returns Sanitized string
 */
export function sanitizeForDisplay(value: string, maxLength?: number): string {
    let sanitized = value
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') //remove control characters
        .trim();

    if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
}
