/**
 * User Preferences Storage for MIRA
 * Persists user settings across sessions
 */

export interface UserPreferences {
    // Display
    theme: 'dark' | 'light' | 'system';
    fontSize: 'small' | 'medium' | 'large';

    // AI Settings
    defaultModel: string;
    streamingEnabled: boolean;
    webSearchDefault: boolean;

    // Language
    preferredLanguage: 'en' | 'si' | 'auto';

    // Behavior
    sendOnEnter: boolean;
    showCodeLineNumbers: boolean;
    autoSaveChats: boolean;

    // Accessibility
    reducedMotion: boolean;
    highContrast: boolean;
}

const PREFERENCES_KEY = 'mira-user-preferences';

const defaultPreferences: UserPreferences = {
    theme: 'dark',
    fontSize: 'medium',
    defaultModel: 'gemini-2.0-flash',
    streamingEnabled: true,
    webSearchDefault: false,
    preferredLanguage: 'auto',
    sendOnEnter: true,
    showCodeLineNumbers: true,
    autoSaveChats: true,
    reducedMotion: false,
    highContrast: false,
};

/**
 * Get all user preferences
 */
export function getPreferences(): UserPreferences {
    try {
        const stored = localStorage.getItem(PREFERENCES_KEY);
        if (stored) {
            return { ...defaultPreferences, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.warn('Failed to load preferences:', e);
    }
    return { ...defaultPreferences };
}

/**
 * Save all preferences
 */
export function savePreferences(prefs: UserPreferences): void {
    try {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (e) {
        console.warn('Failed to save preferences:', e);
    }
}

/**
 * Update a single preference
 */
export function updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
): UserPreferences {
    const prefs = getPreferences();
    prefs[key] = value;
    savePreferences(prefs);
    return prefs;
}

/**
 * Reset to defaults
 */
export function resetPreferences(): UserPreferences {
    savePreferences(defaultPreferences);
    return { ...defaultPreferences };
}

/**
 * React hook for preferences (for easy state management)
 */
import { useState, useCallback, useEffect } from 'react';

export function usePreferences() {
    const [preferences, setPreferencesState] = useState<UserPreferences>(getPreferences);

    // Sync with localStorage changes
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === PREFERENCES_KEY) {
                setPreferencesState(getPreferences());
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const setPreferences = useCallback((
        update: Partial<UserPreferences> | ((prev: UserPreferences) => Partial<UserPreferences>)
    ) => {
        setPreferencesState(prev => {
            const updates = typeof update === 'function' ? update(prev) : update;
            const newPrefs = { ...prev, ...updates };
            savePreferences(newPrefs);
            return newPrefs;
        });
    }, []);

    const reset = useCallback(() => {
        const defaults = resetPreferences();
        setPreferencesState(defaults);
    }, []);

    return { preferences, setPreferences, reset };
}
