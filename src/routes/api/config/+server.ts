import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';

export const GET: RequestHandler = async () => {
	try {
		const { configService } = getServices();
		return json(configService.getConfig());
	} catch (err) {
		console.error('[api/config] GET error:', err);
		throw error(500, 'Failed to get config');
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const { configService } = getServices();
		const updates = await request.json();
		await configService.updateConfig(updates);
		return json(configService.getConfig());
	} catch (err) {
		console.error('[api/config] PUT error:', err);
		throw error(500, 'Failed to update config');
	}
};
