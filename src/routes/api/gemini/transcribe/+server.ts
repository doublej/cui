import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { geminiService } from '$lib/server/services/gemini-service.js';
import { CUIError } from '$lib/server/types/index.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const contentType = request.headers.get('content-type') || '';
		let audio: string;
		let mimeType: string;

		if (contentType.includes('multipart/form-data')) {
			// Handle file upload
			const formData = await request.formData();
			const file = formData.get('audio') as File;

			if (!file) {
				throw new CUIError('INVALID_REQUEST', 'No audio file provided', 400);
			}

			const buffer = await file.arrayBuffer();
			audio = Buffer.from(buffer).toString('base64');
			mimeType = file.type;
		} else {
			// Handle JSON with base64
			const body = await request.json();
			if (!body.audio || !body.mimeType) {
				throw new CUIError('INVALID_REQUEST', 'audio and mimeType are required', 400);
			}
			audio = body.audio;
			mimeType = body.mimeType;
		}

		const result = await geminiService.transcribe(audio, mimeType);
		return json(result);
	} catch (err) {
		if (err instanceof CUIError) {
			throw error(err.statusCode, err.message);
		}
		console.error('[api/gemini/transcribe] POST error:', err);
		throw error(500, 'Failed to transcribe audio');
	}
};
