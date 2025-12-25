import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';

// List permissions
export const GET: RequestHandler = async ({ url }) => {
	try {
		const { permissionTracker } = getServices();

		const streamingId = url.searchParams.get('streamingId') || undefined;
		const status = url.searchParams.get('status') as 'pending' | 'approved' | 'denied' | undefined;

		const permissions = permissionTracker.getPermissionRequests({ streamingId, status });

		return json({ permissions });
	} catch (err) {
		console.error('[api/permissions] GET error:', err);
		throw error(500, 'Failed to list permissions');
	}
};
