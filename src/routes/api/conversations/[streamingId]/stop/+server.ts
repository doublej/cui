import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';

export const POST: RequestHandler = async ({ params }) => {
	const { streamingId } = params;

	try {
		const { agentService } = getServices();
		const success = await agentService.stopConversation(streamingId);
		return json({ success });
	} catch (err) {
		console.error('[api/conversations/[streamingId]/stop] POST error:', err);
		throw error(500, 'Failed to stop conversation');
	}
};
