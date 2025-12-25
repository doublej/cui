import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { webPushService } = getServices();
		await webPushService.initialize();

		const { endpoint } = await request.json();
		if (!endpoint) {
			throw error(400, 'endpoint is required');
		}

		webPushService.removeSubscriptionByEndpoint(endpoint);

		return json({ success: true });
	} catch (err) {
		console.error('[api/notifications/unregister] POST error:', err);
		throw error(500, 'Failed to unregister subscription');
	}
};
