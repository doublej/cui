import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';
import type { ConversationListQuery } from '$lib/server/types/index.js';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const { historyReader, conversationStatusManager, toolMetricsService, sessionInfoService } =
			getServices();

		// Parse query params
		const query: ConversationListQuery = {
			limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
			offset: url.searchParams.get('offset')
				? parseInt(url.searchParams.get('offset')!)
				: undefined,
			projectPath: url.searchParams.get('projectPath') || undefined,
			archived: url.searchParams.get('showArchived') === 'true'
		};

		const result = await historyReader.listConversations(query);

		// Update status for each conversation based on active streams
		const conversationsWithStatus = result.conversations.map((conversation) => {
			const status = conversationStatusManager.getConversationStatus(conversation.sessionId);
			const baseConversation = { ...conversation, status };

			// Add toolMetrics if available
			const metrics = toolMetricsService.getMetrics(conversation.sessionId);
			if (metrics) {
				baseConversation.toolMetrics = metrics;
			}

			// Add streamingId if conversation is ongoing
			if (status === 'ongoing') {
				const streamingId = conversationStatusManager.getStreamingId(conversation.sessionId);
				if (streamingId) {
					return { ...baseConversation, streamingId };
				}
			}

			return baseConversation;
		});

		// Get active sessions not in history
		const existingSessionIds = new Set(conversationsWithStatus.map((c) => c.sessionId));
		const conversationsNotInHistory =
			conversationStatusManager.getConversationsNotInHistory(existingSessionIds);

		const allConversations = [...conversationsWithStatus, ...conversationsNotInHistory];

		// Sync missing sessions
		try {
			await sessionInfoService.syncMissingSessions(allConversations.map((c) => c.sessionId));
		} catch {
			// Non-fatal error
		}

		return json({
			conversations: allConversations,
			total: result.total + conversationsNotInHistory.length
		});
	} catch (err) {
		console.error('[api/conversations] GET error:', err);
		throw error(500, 'Failed to list conversations');
	}
};
