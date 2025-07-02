/**
 * Local storage utility functions for storing and retrieving data
 * Uses localStorage API when available (web platform)
 */

// Check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
    try {
        return typeof Storage !== 'undefined' && typeof localStorage !== 'undefined';
    } catch {
        return false;
    }
};

/**
 * Store data in localStorage
 * @param key - The key to store the data under
 * @param value - The value to store (will be JSON stringified)
 * @returns Promise<boolean> - Success status
 */
export const setItem = async <T>(key: string, value: T): Promise<boolean> => {
    try {
        if (!isLocalStorageAvailable()) {
            console.warn('localStorage is not available');
            return false;
        }

        const serializedValue = JSON.stringify(value);
        localStorage.setItem(key, serializedValue);
        return true;
    } catch (error) {
        console.error('Error storing data:', error);
        return false;
    }
};

/**
 * Retrieve data from localStorage
 * @param key - The key to retrieve data for
 * @returns Promise<T | null> - The retrieved data or null if not found
 */
export const getItem = async <T>(key: string): Promise<T | null> => {
    try {
        if (!isLocalStorageAvailable()) {
            console.warn('localStorage is not available');
            return null;
        }

        const item = localStorage.getItem(key);
        if (item === null) {
            return null;
        }

        return JSON.parse(item) as T;
    } catch (error) {
        console.error('Error retrieving data:', error);
        return null;
    }
};

/**
 * Remove data from localStorage
 * @param key - The key to remove
 * @returns Promise<boolean> - Success status
 */
export const removeItem = async (key: string): Promise<boolean> => {
    try {
        if (!isLocalStorageAvailable()) {
            console.warn('localStorage is not available');
            return false;
        }

        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing data:', error);
        return false;
    }
};

/**
 * Clear all data from localStorage
 * @returns Promise<boolean> - Success status
 */
export const clear = async (): Promise<boolean> => {
    try {
        if (!isLocalStorageAvailable()) {
            console.warn('localStorage is not available');
            return false;
        }

        localStorage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing localStorage:', error);
        return false;
    }
};

/**
 * Get all keys from localStorage
 * @returns Promise<string[]> - Array of all keys
 */
export const getAllKeys = async (): Promise<string[]> => {
    try {
        if (!isLocalStorageAvailable()) {
            console.warn('localStorage is not available');
            return [];
        }

        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                keys.push(key);
            }
        }
        return keys;
    } catch (error) {
        console.error('Error getting all keys:', error);
        return [];
    }
};

/**
 * Check if a key exists in localStorage
 * @param key - The key to check
 * @returns Promise<boolean> - Whether the key exists
 */
export const hasItem = async (key: string): Promise<boolean> => {
    try {
        if (!isLocalStorageAvailable()) {
            return false;
        }

        return localStorage.getItem(key) !== null;
    } catch (error) {
        console.error('Error checking if key exists:', error);
        return false;
    }
};

/**
 * Get the size of localStorage (number of items)
 * @returns Promise<number> - Number of items in localStorage
 */
export const getSize = async (): Promise<number> => {
    try {
        if (!isLocalStorageAvailable()) {
            return 0;
        }

        return localStorage.length;
    } catch (error) {
        console.error('Error getting localStorage size:', error);
        return 0;
    }
};

// Default export with all functions
export default {
    setItem,
    getItem,
    removeItem,
    clear,
    getAllKeys,
    hasItem,
    getSize,
    isAvailable: isLocalStorageAvailable,
};


