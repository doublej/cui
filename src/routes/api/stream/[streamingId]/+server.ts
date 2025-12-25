import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';

export const GET: RequestHandler = async ({ params }) => {
	const { streamingId } = params;
	const { streamManager } = getServices();

	const stream = streamManager.createStream(streamingId);

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'X-Accel-Buffering': 'no',
			Connection: 'keep-alive'
		}
	});
};
