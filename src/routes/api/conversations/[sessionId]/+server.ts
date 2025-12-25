import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';
import { CUIError } from '$lib/server/types/index.js';

// GET conversation details
export const GET: RequestHandler = async ({ params }) => {
	const { sessionId } = params;

	try {
		const { historyReader, conversationStatusManager, toolMetricsService } = getServices();

		// Try to fetch from history
		try {
			const messages = await historyReader.fetchConversation(sessionId);
			const metadata = await historyReader.getConversationMetadata(sessionId);

			if (!metadata) {
				throw new CUIError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
			}

			const response = {
				messages,
				summary: metadata.summary,
				projectPath: metadata.projectPath,
				metadata: {
					totalDuration: metadata.totalDuration,
					model: metadata.model
				},
				toolMetrics: toolMetricsService.getMetrics(sessionId)
			};

			return json(response);
		} catch (historyError) {
			// Check if it's an active session not yet in history
			if (historyError instanceof CUIError && historyError.code === 'CONVERSATION_NOT_FOUND') {
				const activeDetails = conversationStatusManager.getActiveConversationDetails(sessionId);

				if (activeDetails) {
					return json(activeDetails);
				}
			}
			throw historyError;
		}
	} catch (err) {
		if (err instanceof CUIError) {
			throw error(err.statusCode, err.message);
		}
		console.error('[api/conversations/[sessionId]] GET error:', err);
		throw error(500, 'Failed to get conversation details');
	}
};
