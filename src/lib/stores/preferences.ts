import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export type ColorScheme = 'light' | 'dark' | 'system';

export interface Preferences {
	colorScheme: ColorScheme;
	language: string;
}

const PREFERENCES_KEY = 'cui-preferences';

const defaultPreferences: Preferences = {
	colorScheme: 'system',
	language: 'en'
};

function createPreferencesStore() {
	function getInitial(): Preferences {
		if (!browser) return defaultPreferences;
		const stored = localStorage.getItem(PREFERENCES_KEY);
		if (stored) {
			try {
				return { ...defaultPreferences, ...JSON.parse(stored) };
			} catch {
				return defaultPreferences;
			}
		}
		return defaultPreferences;
	}

	const { subscribe, set, update } = writable<Preferences>(getInitial());

	return {
		subscribe,
		setColorScheme: (scheme: ColorScheme) => {
			update((prefs) => {
				const updated = { ...prefs, colorScheme: scheme };
				if (browser) {
					localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
				}
				return updated;
			});
		},
		setLanguage: (language: string) => {
			update((prefs) => {
				const updated = { ...prefs, language };
				if (browser) {
					localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
				}
				return updated;
			});
		},
		reset: () => {
			if (browser) {
				localStorage.removeItem(PREFERENCES_KEY);
			}
			set(defaultPreferences);
		}
	};
}

export const preferences = createPreferencesStore();

// Derived store for effective theme (resolves 'system')
export const effectiveTheme = derived(preferences, ($prefs) => {
	if ($prefs.colorScheme === 'system') {
		if (!browser) return 'light';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	return $prefs.colorScheme;
});
