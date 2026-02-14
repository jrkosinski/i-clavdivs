import { describe, it, expect } from 'vitest';
import { isValidCoordinates, createLocation, formatCoordinates } from '../src/types/location.js';

describe('location', () => {
    describe('isValidCoordinates', () => {
        it('validates correct coordinates', () => {
            expect(isValidCoordinates(0, 0)).toBe(true);
            expect(isValidCoordinates(45.5, -122.6)).toBe(true);
            expect(isValidCoordinates(-90, 180)).toBe(true);
            expect(isValidCoordinates(90, -180)).toBe(true);
        });

        it('rejects invalid latitudes', () => {
            expect(isValidCoordinates(-91, 0)).toBe(false);
            expect(isValidCoordinates(91, 0)).toBe(false);
            expect(isValidCoordinates(-100, 50)).toBe(false);
        });

        it('rejects invalid longitudes', () => {
            expect(isValidCoordinates(0, -181)).toBe(false);
            expect(isValidCoordinates(0, 181)).toBe(false);
            expect(isValidCoordinates(45, 200)).toBe(false);
        });
    });

    describe('createLocation', () => {
        it('creates location from valid coordinates', () => {
            const loc = createLocation(45.5, -122.6);
            expect(loc).not.toBeNull();
            expect(loc?.latitude).toBe(45.5);
            expect(loc?.longitude).toBe(-122.6);
        });

        it('includes optional fields', () => {
            const loc = createLocation(45.5, -122.6, {
                altitude: 100,
                accuracy: 10,
                address: 'Portland, OR',
            });
            expect(loc?.altitude).toBe(100);
            expect(loc?.accuracy).toBe(10);
            expect(loc?.address).toBe('Portland, OR');
        });

        it('returns null for invalid coordinates', () => {
            expect(createLocation(91, 0)).toBeNull();
            expect(createLocation(0, 181)).toBeNull();
            expect(createLocation(-100, 200)).toBeNull();
        });
    });

    describe('formatCoordinates', () => {
        it('formats coordinates with default precision', () => {
            const loc = createLocation(45.523064, -122.676483)!;
            expect(formatCoordinates(loc)).toBe('45.523064, -122.676483');
        });

        it('formats coordinates with custom precision', () => {
            const loc = createLocation(45.523064, -122.676483)!;
            expect(formatCoordinates(loc, 2)).toBe('45.52, -122.68');
            expect(formatCoordinates(loc, 4)).toBe('45.5231, -122.6765');
        });

        it('handles zero coordinates', () => {
            const loc = createLocation(0, 0)!;
            expect(formatCoordinates(loc, 2)).toBe('0.00, 0.00');
        });
    });
});
