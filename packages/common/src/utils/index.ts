/**
 * Utility functions
 */

import { validate as validateUuid } from 'uuid';

/**
 * Check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Sleep for a specified number of milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Asynchronous delay helper function.
 *
 * @param ms - Number of milliseconds to pause
 * @returns Promise that resolves after the specified delay
 */
export async function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

/**
 * Checks if a string consists only of digits (no decimal points).
 *
 * @param s - The string to validate
 * @returns True if the string is non-null and contains only digits after trimming, false otherwise
 */
export function stringIsNumeric(s: string): boolean {
  return s ? /^[0-9]+$/.test(s.trim()) : false;
}

/**
 * Validates if a value is numeric (supports string, number, or BigInt).
 *
 * @param value - The value to validate
 * @returns True if the value represents a valid number, false otherwise
 */
export function isNumeric(value: string | number | BigInt): boolean {
  if (typeof value === 'number') {
    return !isNaN(value);
  }
  const s = value.toString();

  for (let i = 0; i < s.length; i++) {
    if (isNaN(Number(s[i]))) {
      return false;
    }
  }

  return true;
}

/**
 * Validates if a string is a properly formatted UUID.
 *
 * @param value - The string to validate
 * @returns True if the string matches UUID format, false otherwise
 */
export function isValidUuid(value: string): boolean {
  return validateUuid(value);
}

/**
 * Type guard to check if a value is an array of strings.
 *
 * @param value - The value to check
 * @returns True if value is an array where all elements are strings, false otherwise
 */
export function isStringArray(value: any): value is string[] {
  // First, check if the value is an array
  if (!Array.isArray(value)) {
    return false;
  }

  // Then, check if every element in the array is a string
  return value.every((item) => typeof item === 'string');
}

/**
 * Gets the current Unix timestamp in seconds.
 *
 * @returns Current time as Unix timestamp (seconds since epoch)
 * @example
 * const now = getUnixTimestamp(); // 1735689600
 */
export function getUnixTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Converts a JavaScript Date object to a Unix timestamp in seconds.
 *
 * @param date - The Date object to convert
 * @returns Unix timestamp in seconds
 * @example
 * const date = new Date('2025-01-01T00:00:00.000Z');
 * const timestamp = toUnixTimestamp(date); // 1735689600
 */
export function toUnixTimestamp(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Parses an ISO date string and returns both a Date object and Unix timestamp.
 * Truncates the ISO string to 23 characters and appends 'Z' for UTC timezone.
 *
 * @param isoDateString - ISO 8601 formatted date string
 * @returns Object containing both Date and Unix timestamp
 * @example
 * const result = parseIsoDate('2025-01-15T10:30:00.000Z');
 * // { date: Date, timestamp: 1736936400 }
 */
export function parseIsoDate(isoDateString: string): {
  date: Date;
  timestamp: number;
} {
  const parsed =
    isoDateString.length <= 23
      ? isoDateString
      : Date.parse(isoDateString.slice(0, 23) + 'Z');
  const date = new Date(parsed);
  const timestamp = toUnixTimestamp(date);

  return { date, timestamp };
}

/**
 * Adds or subtracts minutes from a given time and returns Unix timestamp.
 *
 * @param time - Either a Date object or Unix timestamp in seconds
 * @param minutes - Number of minutes to add (positive) or subtract (negative)
 * @returns Resulting Unix timestamp in seconds
 * @example
 * const timestamp = 1735689600;
 * const later = timePlusMinutes(timestamp, 30); // 1735691400 (30 minutes later)
 * const earlier = timePlusMinutes(timestamp, -15); // 1735688700 (15 minutes earlier)
 */
export function timePlusMinutes(time: Date | number, minutes: number): number {
  if (typeof time != 'number') time = toUnixTimestamp(time);
  return time + minutes * 60;
}

/**
 * Attempts to parse a string into a float. Returns a default value if parsing fails.
 *
 * @param value - The string to parse as a float
 * @param defaultValue - The value to return if parsing fails (default: 0.00)
 * @returns The parsed float or the default value
 * @example
 * tryParseFloat('3.14'); // 3.14
 * tryParseFloat('invalid'); // 0.00
 * tryParseFloat('invalid', -1); // -1
 */
export function tryParseFloat(value: string, defaultValue: number = 0.0): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export interface IBooleanParseOptions {
  truthy?: string[];
  falsy?: string[];
}

const DEFAULT_TRUTHY = ['true', '1', 'yes', 'on'] as const;
const DEFAULT_FALSY = ['false', '0', 'no', 'off'] as const;
const DEFAULT_TRUTHY_SET = new Set<string>(DEFAULT_TRUTHY);
const DEFAULT_FALSY_SET = new Set<string>(DEFAULT_FALSY);

/**
 * Parses a value as a boolean, supporting various string representations.
 * Returns undefined if the value cannot be parsed as a boolean.
 *
 * @param value - The value to parse (boolean, string, or other)
 * @param options - Optional custom truthy/falsy string arrays
 * @returns The parsed boolean value, or undefined if unparseable
 * @example
 * parseBooleanValue(true); // true
 * parseBooleanValue('yes'); // true
 * parseBooleanValue('no'); // false
 * parseBooleanValue('invalid'); // undefined
 */
export function parseBooleanValue(
  value: unknown,
  options: IBooleanParseOptions = {}
): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  const truthy = options.truthy ?? DEFAULT_TRUTHY;
  const falsy = options.falsy ?? DEFAULT_FALSY;
  const truthySet = truthy === DEFAULT_TRUTHY ? DEFAULT_TRUTHY_SET : new Set(truthy);
  const falsySet = falsy === DEFAULT_FALSY ? DEFAULT_FALSY_SET : new Set(falsy);
  if (truthySet.has(normalized)) {
    return true;
  }
  if (falsySet.has(normalized)) {
    return false;
  }
  return undefined;
}
