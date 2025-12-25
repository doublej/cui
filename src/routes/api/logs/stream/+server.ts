import type { RequestHandler } from './$types';
import { logStreamBuffer } from '$lib/server/services/log-stream-buffer.js';

export const GET: RequestHandler = async () => {
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			// Send initial connection confirmation
			controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

			// Log listener
			const logListener = (logLine: string) => {
				try {
					controller.enqueue(encoder.encode(`data: ${logLine}\n\n`));
				} catch {
					// Controller may be closed
				}
			};

			// Subscribe to log events
			logStreamBuffer.on('log', logListener);

			// Heartbeat every 30 seconds
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(':heartbeat\n\n'));
				} catch {
					clearInterval(heartbeat);
				}
			}, 30000);

			// Store cleanup function
			(controller as unknown as { cleanup: () => void }).cleanup = () => {
				logStreamBuffer.removeListener('log', logListener);
				clearInterval(heartbeat);
			};
		},
		cancel(controller) {
			const ctrl = controller as unknown as { cleanup?: () => void };
			if (ctrl.cleanup) ctrl.cleanup();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};
