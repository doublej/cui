import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { geminiService } from '$lib/server/services/gemini-service.js';

export const GET: RequestHandler = async () => {
	try {
		const result = await geminiService.checkHealth();
		return json(result);
	} catch (err) {
		console.error('[api/gemini/health] GET error:', err);
		throw error(500, 'Failed to check Gemini health');
	}
};
