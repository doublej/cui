import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';

export const GET: RequestHandler = async () => {
	try {
		const { workingDirectoriesService } = getServices();
		const result = await workingDirectoriesService.getWorkingDirectories();
		return json(result);
	} catch (err) {
		console.error('[api/working-directories] GET error:', err);
		throw error(500, 'Failed to get working directories');
	}
};
