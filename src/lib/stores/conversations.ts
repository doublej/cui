import { writable, derived } from 'svelte/store';
import type {
	ConversationSummary,
	ConversationMessage,
	ConversationDetailsResponse,
	StartConversationRequest,
	StartConversationResponse,
	ToolMetrics
} from '$lib/server/types/index.js';
import { authToken } from './auth.js';
import { get } from 'svelte/store';

export type ConversationStatus = 'completed' | 'ongoing' | 'pending';

export interface ConversationState {
	list: ConversationSummary[];
	loading: boolean;
	error: string | null;
	currentSessionId: string | null;
	currentMessages: ConversationMessage[];
	currentLoading: boolean;
}

const initialState: ConversationState = {
	list: [],
	loading: false,
	error: null,
	currentSessionId: null,
	currentMessages: [],
	currentLoading: false
};

function createConversationsStore() {
	const { subscribe, update } = writable<ConversationState>(initialState);

	async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
		const token = get(authToken);
		return fetch(url, {
			...options,
			headers: {
				...options.headers,
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});
	}

	return {
		subscribe,

		async fetchList(options: { showArchived?: boolean } = {}): Promise<void> {
			update((s) => ({ ...s, loading: true, error: null }));
			try {
				const params = new URLSearchParams();
				if (options.showArchived) params.set('showArchived', 'true');
				const res = await fetchWithAuth(`/api/conversations?${params}`);
				if (!res.ok) throw new Error('Failed to fetch conversations');
				const data = await res.json();
				update((s) => ({ ...s, list: data.conversations, loading: false }));
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				update((s) => ({ ...s, error: message, loading: false }));
			}
		},

		async fetchDetails(sessionId: string): Promise<ConversationDetailsResponse | null> {
			update((s) => ({ ...s, currentSessionId: sessionId, currentLoading: true }));
			try {
				const res = await fetchWithAuth(`/api/conversations/${sessionId}`);
				if (!res.ok) throw new Error('Failed to fetch conversation');
				const data: ConversationDetailsResponse = await res.json();
				update((s) => ({ ...s, currentMessages: data.messages, currentLoading: false }));
				return data;
			} catch {
				update((s) => ({ ...s, currentLoading: false }));
				return null;
			}
		},

		async start(request: StartConversationRequest): Promise<StartConversationResponse | null> {
			try {
				const res = await fetchWithAuth('/api/conversations/start', {
					method: 'POST',
					body: JSON.stringify(request)
				});
				if (!res.ok) throw new Error('Failed to start conversation');
				return await res.json();
			} catch {
				return null;
			}
		},

		async stop(streamingId: string): Promise<boolean> {
			try {
				const res = await fetchWithAuth(`/api/conversations/${streamingId}/stop`, {
					method: 'POST'
				});
				return res.ok;
			} catch {
				return false;
			}
		},

		async rename(sessionId: string, name: string): Promise<boolean> {
			try {
				const res = await fetchWithAuth(`/api/conversations/${sessionId}/rename`, {
					method: 'PUT',
					body: JSON.stringify({ customName: name })
				});
				if (res.ok) {
					update((s) => ({
						...s,
						list: s.list.map((c) =>
							c.sessionId === sessionId
								? { ...c, sessionInfo: { ...c.sessionInfo, custom_name: name } }
								: c
						)
					}));
				}
				return res.ok;
			} catch {
				return false;
			}
		},

		async updateSession(
			sessionId: string,
			updates: { pinned?: boolean; archived?: boolean }
		): Promise<boolean> {
			try {
				const res = await fetchWithAuth(`/api/conversations/${sessionId}/update`, {
					method: 'PUT',
					body: JSON.stringify(updates)
				});
				if (res.ok) {
					update((s) => ({
						...s,
						list: s.list.map((c) =>
							c.sessionId === sessionId
								? { ...c, sessionInfo: { ...c.sessionInfo, ...updates } }
								: c
						)
					}));
				}
				return res.ok;
			} catch {
				return false;
			}
		},

		addMessage(message: ConversationMessage): void {
			update((s) => ({
				...s,
				currentMessages: [...s.currentMessages, message]
			}));
		},

		updateConversationStatus(sessionId: string, status: ConversationStatus): void {
			update((s) => ({
				...s,
				list: s.list.map((c) => (c.sessionId === sessionId ? { ...c, status } : c))
			}));
		},

		updateToolMetrics(sessionId: string, metrics: ToolMetrics): void {
			update((s) => ({
				...s,
				list: s.list.map((c) => (c.sessionId === sessionId ? { ...c, toolMetrics: metrics } : c))
			}));
		},

		clearCurrent(): void {
			update((s) => ({
				...s,
				currentSessionId: null,
				currentMessages: [],
				currentLoading: false
			}));
		}
	};
}

export const conversations = createConversationsStore();

// Derived stores
export const activeConversations = derived(conversations, ($c) =>
	$c.list.filter((c) => c.status === 'ongoing')
);
export const completedConversations = derived(conversations, ($c) =>
	$c.list.filter((c) => c.status === 'completed')
);
export const currentConversation = derived(conversations, ($c) =>
	$c.list.find((c) => c.sessionId === $c.currentSessionId)
);
