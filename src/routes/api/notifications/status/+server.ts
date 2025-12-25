import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';

export const GET: RequestHandler = async () => {
	const { webPushService } = getServices();
	await webPushService.initialize();

	return json({
		enabled: webPushService.getEnabled(),
		subscriptionCount: webPushService.getSubscriptionCount(),
		hasPublicKey: !!webPushService.getPublicKey(),
		publicKey: webPushService.getPublicKey() || undefined
	});
};
