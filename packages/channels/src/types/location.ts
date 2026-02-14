/**
 * Geographic location type definitions.
 *
 * Provides types for location data that may be shared through
 * communication channels.
 */

/**
 * Geographic coordinate information.
 */
export interface ILocation {
    /**
     * Latitude coordinate.
     */
    latitude: number;

    /**
     * Longitude coordinate.
     */
    longitude: number;

    /**
     * Optional altitude in meters.
     */
    altitude?: number;

    /**
     * Optional accuracy radius in meters.
     */
    accuracy?: number;

    /**
     * Optional human-readable address or name.
     */
    address?: string;
}

/**
 * Validates if coordinates represent a valid geographic location.
 *
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @returns True if coordinates are valid
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
    //latitude must be between -90 and 90
    if (lat < -90 || lat > 90) {
        return false;
    }

    //longitude must be between -180 and 180
    if (lng < -180 || lng > 180) {
        return false;
    }

    return true;
}

/**
 * Creates a location object from coordinates.
 *
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param options - Optional additional location data
 * @returns Location object or null if coordinates are invalid
 */
export function createLocation(
    latitude: number,
    longitude: number,
    options?: Partial<Omit<ILocation, 'latitude' | 'longitude'>>
): ILocation | null {
    if (!isValidCoordinates(latitude, longitude)) {
        return null;
    }

    return {
        latitude,
        longitude,
        ...options,
    };
}

/**
 * Formats coordinates as a display string.
 *
 * @param location - The location to format
 * @param precision - Number of decimal places (default: 6)
 * @returns Formatted coordinate string
 */
export function formatCoordinates(location: ILocation, precision: number = 6): string {
    const lat = location.latitude.toFixed(precision);
    const lng = location.longitude.toFixed(precision);
    return `${lat}, ${lng}`;
}
