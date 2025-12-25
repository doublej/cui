import type { StreamEvent } from '$lib/server/types/index.js';
import { EventEmitter } from 'events';
import { createLogger } from './logger.js';
import { type Logger } from './logger.js';

type StreamController = ReadableStreamDefaultController<Uint8Array>;

/**
 * Manages streaming connections to multiple clients (SvelteKit ReadableStream compatible)
 */
export class StreamManager extends EventEmitter {
	private clients: Map<string, Set<StreamController>> = new Map();
	private logger: Logger;
	private heartbeatInterval?: ReturnType<typeof setInterval>;
	private encoder = new TextEncoder();

	private readonly HEARTBEAT_INTERVAL_MS = 30000;

	constructor() {
		super();
		this.logger = createLogger('StreamManager');
	}

	/**
	 * Create a ReadableStream for SSE that subscribes to this streaming session
	 */
	createStream(streamingId: string): ReadableStream<Uint8Array> {
		this.logger.debug('Creating stream for client', { streamingId });

		return new ReadableStream({
			start: (controller) => {
				this.addClient(streamingId, controller);
			},
			cancel: () => {
				this.logger.debug('Stream cancelled by client', { streamingId });
			}
		});
	}

	/**
	 * Add a stream controller to receive updates
	 */
	private addClient(streamingId: string, controller: StreamController): void {
		if (!this.clients.has(streamingId)) {
			this.clients.set(streamingId, new Set());
		}

		this.clients.get(streamingId)!.add(controller);

		this.logger.debug('Client added successfully', {
			streamingId,
			totalClients: this.clients.get(streamingId)!.size
		});

		// Send initial connection confirmation
		const connectionMessage: StreamEvent = {
			type: 'connected',
			streaming_id: streamingId,
			timestamp: new Date().toISOString()
		};

		this.sendSSEEvent(controller, connectionMessage);

		// Start heartbeat if this is the first client
		this.startHeartbeat();
	}

	/**
	 * Remove a client connection
	 */
	removeClient(streamingId: string, controller: StreamController): void {
		const clients = this.clients.get(streamingId);
		if (clients) {
			clients.delete(controller);
			if (clients.size === 0) {
				this.clients.delete(streamingId);
			}
		}
		this.emit('client-disconnected', { streamingId });

		if (this.getTotalClientCount() === 0) {
			this.stopHeartbeat();
		}
	}

	/**
	 * Broadcast an event to all clients watching a session
	 */
	broadcast(streamingId: string, event: unknown): void {
		this.logger.debug('Broadcasting event to clients', {
			streamingId,
			eventType: (event as StreamEvent)?.type
		});

		const clients = this.clients.get(streamingId);
		if (!clients || clients.size === 0) {
			this.logger.debug('No clients found for streaming session', { streamingId });
			return;
		}

		const deadClients: StreamController[] = [];

		for (const client of clients) {
			try {
				this.sendSSEEvent(client, event as StreamEvent);
			} catch {
				deadClients.push(client);
			}
		}

		// Clean up dead clients
		deadClients.forEach((client) => this.removeClient(streamingId, client));
	}

	/**
	 * Send an SSE event to a specific client
	 */
	private sendSSEEvent(controller: StreamController, message: StreamEvent): void {
		const sseData = `data: ${JSON.stringify(message)}\n\n`;
		controller.enqueue(this.encoder.encode(sseData));
	}

	/**
	 * Send SSE heartbeat comment to keep connection alive
	 */
	private sendHeartbeat(controller: StreamController): void {
		try {
			controller.enqueue(this.encoder.encode(': heartbeat\n\n'));
		} catch {
			// Controller may be closed
		}
	}

	/**
	 * Get number of clients connected to a session
	 */
	getClientCount(streamingId: string): number {
		return this.clients.get(streamingId)?.size || 0;
	}

	/**
	 * Get all active sessions
	 */
	getActiveSessions(): string[] {
		return Array.from(this.clients.keys());
	}

	/**
	 * Close all connections for a session
	 */
	closeSession(streamingId: string): void {
		const clients = this.clients.get(streamingId);
		if (!clients) return;

		const closeEvent: StreamEvent = {
			type: 'closed',
			streamingId: streamingId,
			timestamp: new Date().toISOString()
		};

		for (const client of Array.from(clients)) {
			try {
				this.sendSSEEvent(client, closeEvent);
				client.close();
			} catch {
				// Controller may already be closed
			}
		}

		this.clients.delete(streamingId);

		if (this.getTotalClientCount() === 0) {
			this.stopHeartbeat();
		}
	}

	/**
	 * Get total number of clients across all sessions
	 */
	getTotalClientCount(): number {
		let total = 0;
		for (const clients of this.clients.values()) {
			total += clients.size;
		}
		return total;
	}

	/**
	 * Disconnect all clients from all sessions
	 */
	disconnectAll(): void {
		for (const streamingId of this.clients.keys()) {
			this.closeSession(streamingId);
		}
		this.stopHeartbeat();
	}

	/**
	 * Start periodic heartbeat to keep SSE connections alive
	 */
	private startHeartbeat(): void {
		if (this.heartbeatInterval) return;

		this.heartbeatInterval = setInterval(() => {
			for (const clients of this.clients.values()) {
				for (const client of clients) {
					this.sendHeartbeat(client);
				}
			}
		}, this.HEARTBEAT_INTERVAL_MS);
	}

	/**
	 * Stop periodic heartbeat
	 */
	private stopHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = undefined;
		}
	}
}
