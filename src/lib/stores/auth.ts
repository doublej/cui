import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const AUTH_TOKEN_KEY = 'cui-auth-token';

function createAuthStore() {
	// Initialize from URL hash or localStorage
	function getInitialToken(): string | null {
		if (!browser) return null;

		// Check URL hash first (for initial auth)
		const hash = window.location.hash;
		if (hash.startsWith('#token=')) {
			const token = hash.slice(7);
			// Clear hash from URL
			window.history.replaceState(null, '', window.location.pathname);
			localStorage.setItem(AUTH_TOKEN_KEY, token);
			return token;
		}

		return localStorage.getItem(AUTH_TOKEN_KEY);
	}

	const { subscribe, set } = writable<string | null>(getInitialToken());

	return {
		subscribe,
		setToken: (token: string) => {
			if (browser) {
				localStorage.setItem(AUTH_TOKEN_KEY, token);
			}
			set(token);
		},
		clearToken: () => {
			if (browser) {
				localStorage.removeItem(AUTH_TOKEN_KEY);
			}
			set(null);
		}
	};
}

export const authToken = createAuthStore();
export const isAuthenticated = derived(authToken, ($token) => $token !== null);
