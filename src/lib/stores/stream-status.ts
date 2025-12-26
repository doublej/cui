import { writable, derived, get } from 'svelte/store';
import type { StreamEvent, PermissionRequest } from '$lib/server/types/index.js';
import { authToken } from './auth.js';
import { conversations } from './conversations.js';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface StreamState {
	streamingId: string;
	status: ConnectionStatus;
	error: string | null;
}

export interface StreamStoreState {
	streams: Map<string, StreamState>;
	permissions: PermissionRequest[];
}

const initialState: StreamStoreState = {
	streams: new Map(),
	permissions: []
};

function createStreamStore() {
	const { subscribe, update } = writable<StreamStoreState>(initialState);
	const eventSources = new Map<string, EventSource>();

	function setStreamStatus(streamingId: string, status: ConnectionStatus, error?: string): void {
		update((s) => {
			const streams = new Map(s.streams);
			streams.set(streamingId, { streamingId, status, error: error ?? null });
			return { ...s, streams };
		});
	}

	return {
		subscribe,

		connect(
			streamingId: string,
			onEvent?: (event: StreamEvent) => void
		): () => void {
			// Prevent duplicate connections
			if (eventSources.has(streamingId)) {
				return () => this.disconnect(streamingId);
			}

			setStreamStatus(streamingId, 'connecting');

			const token = get(authToken);
			const url = `/api/stream/${streamingId}`;
			const es = new EventSource(`${url}?token=${token}`);
			eventSources.set(streamingId, es);

			es.onopen = () => {
				setStreamStatus(streamingId, 'connected');
			};

			es.onmessage = (event) => {
				try {
					const data: StreamEvent = JSON.parse(event.data);

					// Handle permission requests
					if (data.type === 'permission_request') {
						update((s) => ({
							...s,
							permissions: [...s.permissions, data.data]
						}));
					}

					// Handle messages
					if (data.type === 'assistant' || data.type === 'user') {
						const message = {
							uuid: crypto.randomUUID(),
							type: data.type as 'user' | 'assistant',
							message: data.message,
							timestamp: new Date().toISOString(),
							sessionId: data.session_id
						};
						conversations.addMessage(message);
					}

					// Handle stream close
					if (data.type === 'closed' || data.type === 'result') {
						setStreamStatus(streamingId, 'disconnected');
						this.disconnect(streamingId);
					}

					onEvent?.(data);
				} catch {
					// Ignore parse errors
				}
			};

			es.onerror = () => {
				setStreamStatus(streamingId, 'error', 'Connection lost');
				this.disconnect(streamingId);
			};

			return () => this.disconnect(streamingId);
		},

		disconnect(streamingId: string): void {
			const es = eventSources.get(streamingId);
			if (es) {
				es.close();
				eventSources.delete(streamingId);
			}
			setStreamStatus(streamingId, 'disconnected');
		},

		disconnectAll(): void {
			for (const [id] of eventSources) {
				this.disconnect(id);
			}
		},

		resolvePermission(requestId: string): void {
			update((s) => ({
				...s,
				permissions: s.permissions.filter((p) => p.id !== requestId)
			}));
		},

		getStatus(streamingId: string): ConnectionStatus {
			const state = get({ subscribe });
			return state.streams.get(streamingId)?.status ?? 'disconnected';
		}
	};
}

export const streamStore = createStreamStore();

// Derived stores
export const pendingPermissions = derived(streamStore, ($s) =>
	$s.permissions.filter((p) => p.status === 'pending')
);
export const hasActiveStreams = derived(
	streamStore,
	($s) => Array.from($s.streams.values()).some((s) => s.status === 'connected')
);
