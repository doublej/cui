import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ConfigService } from '$lib/server/services/config-service.js';

export const GET: RequestHandler = async () => {
	try {
		const config = ConfigService.getInstance().getConfig();
		return json(config);
	} catch (err) {
		console.error('[api/config] GET error:', err);
		throw error(500, 'Failed to get config');
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const updates = await request.json();
		await ConfigService.getInstance().updateConfig(updates);
		const config = ConfigService.getInstance().getConfig();
		return json(config);
	} catch (err) {
		console.error('[api/config] PUT error:', err);
		throw error(500, 'Failed to update config');
	}
};
