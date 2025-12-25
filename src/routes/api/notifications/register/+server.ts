import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { webPushService } = getServices();
		await webPushService.initialize();

		const subscription = await request.json();
		if (!subscription || !subscription.endpoint) {
			throw error(400, 'Invalid subscription');
		}

		const userAgent = request.headers.get('user-agent') || '';
		webPushService.addOrUpdateSubscription(subscription, userAgent);

		return json({ success: true });
	} catch (err) {
		console.error('[api/notifications/register] POST error:', err);
		throw error(500, 'Failed to register subscription');
	}
};
