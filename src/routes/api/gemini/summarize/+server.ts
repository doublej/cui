import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { geminiService } from '$lib/server/services/gemini-service.js';
import { CUIError } from '$lib/server/types/index.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		if (!body.text) {
			throw new CUIError('INVALID_REQUEST', 'text is required', 400);
		}

		const result = await geminiService.summarize(body.text);
		return json(result);
	} catch (err) {
		if (err instanceof CUIError) {
			throw error(err.statusCode, err.message);
		}
		console.error('[api/gemini/summarize] POST error:', err);
		throw error(500, 'Failed to summarize text');
	}
};
