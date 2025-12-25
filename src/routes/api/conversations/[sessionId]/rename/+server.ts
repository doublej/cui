import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';
import { CUIError, type SessionRenameRequest } from '$lib/server/types/index.js';

export const PUT: RequestHandler = async ({ params, request }) => {
	const { sessionId } = params;

	try {
		const { historyReader, sessionInfoService } = getServices();
		const body: SessionRenameRequest = await request.json();
		const { customName } = body;

		// Validate
		if (!sessionId?.trim()) {
			throw new CUIError('MISSING_SESSION_ID', 'sessionId is required', 400);
		}
		if (customName === undefined || customName === null) {
			throw new CUIError('MISSING_CUSTOM_NAME', 'customName is required', 400);
		}
		if (customName.length > 200) {
			throw new CUIError('CUSTOM_NAME_TOO_LONG', 'customName must be 200 characters or less', 400);
		}

		// Check if session exists
		const metadata = await historyReader.getConversationMetadata(sessionId);
		if (!metadata) {
			throw new CUIError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
		}

		// Update custom name
		await sessionInfoService.updateCustomName(sessionId, customName.trim());

		return json({
			success: true,
			sessionId,
			customName: customName.trim()
		});
	} catch (err) {
		if (err instanceof CUIError) {
			throw error(err.statusCode, err.message);
		}
		console.error('[api/conversations/[sessionId]/rename] PUT error:', err);
		throw error(500, 'Failed to rename session');
	}
};
