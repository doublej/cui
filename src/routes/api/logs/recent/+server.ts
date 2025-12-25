import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logStreamBuffer } from '$lib/server/services/log-stream-buffer.js';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const logs = logStreamBuffer.getRecentLogs(limit);
		return json({ logs });
	} catch (err) {
		console.error('[api/logs/recent] GET error:', err);
		throw error(500, 'Failed to retrieve logs');
	}
};
