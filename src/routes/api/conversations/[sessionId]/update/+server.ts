import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';
import { CUIError, type SessionUpdateRequest, type SessionInfo } from '$lib/server/types/index.js';

export const PUT: RequestHandler = async ({ params, request }) => {
	const { sessionId } = params;

	try {
		const { historyReader, sessionInfoService } = getServices();
		const updates: SessionUpdateRequest = await request.json();

		// Validate sessionId
		if (!sessionId?.trim()) {
			return json(
				{ success: false, sessionId: '', updatedFields: {}, error: 'Session ID is required' },
				{ status: 400 }
			);
		}

		// Check if session exists
		const { conversations } = await historyReader.listConversations();
		const sessionExists = conversations.some((conv) => conv.sessionId === sessionId);

		if (!sessionExists) {
			return json(
				{
					success: false,
					sessionId,
					updatedFields: {},
					error: 'Conversation session not found'
				},
				{ status: 404 }
			);
		}

		// Validate fields
		if (updates.customName !== undefined && updates.customName.length > 200) {
			return json(
				{
					success: false,
					sessionId,
					updatedFields: {},
					error: 'Custom name must be 200 characters or less'
				},
				{ status: 400 }
			);
		}

		if (updates.permissionMode !== undefined) {
			const validModes = ['acceptEdits', 'bypassPermissions', 'default', 'plan'];
			if (!validModes.includes(updates.permissionMode)) {
				return json(
					{
						success: false,
						sessionId,
						updatedFields: {},
						error: `Permission mode must be one of: ${validModes.join(', ')}`
					},
					{ status: 400 }
				);
			}
		}

		// Map camelCase to snake_case
		const sessionUpdates: Partial<SessionInfo> = {};
		if (updates.customName !== undefined) sessionUpdates.custom_name = updates.customName.trim();
		if (updates.pinned !== undefined) sessionUpdates.pinned = updates.pinned;
		if (updates.archived !== undefined) sessionUpdates.archived = updates.archived;
		if (updates.continuationSessionId !== undefined)
			sessionUpdates.continuation_session_id = updates.continuationSessionId;
		if (updates.initialCommitHead !== undefined)
			sessionUpdates.initial_commit_head = updates.initialCommitHead;
		if (updates.permissionMode !== undefined)
			sessionUpdates.permission_mode = updates.permissionMode;

		const updatedFields = await sessionInfoService.updateSessionInfo(sessionId, sessionUpdates);

		return json({
			success: true,
			sessionId,
			updatedFields
		});
	} catch (err) {
		if (err instanceof CUIError) {
			throw error(err.statusCode, err.message);
		}
		console.error('[api/conversations/[sessionId]/update] PUT error:', err);
		throw error(500, 'Failed to update session');
	}
};
