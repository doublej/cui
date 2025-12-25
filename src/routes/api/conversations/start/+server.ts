import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';
import { CUIError, type StartConversationRequest, type ConversationMessage } from '$lib/server/types/index.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const {
			agentService,
			historyReader,
			sessionInfoService,
			conversationStatusManager
		} = getServices();

		const body: StartConversationRequest = await request.json();

		// Validate required fields
		if (!body.workingDirectory) {
			throw new CUIError('MISSING_WORKING_DIRECTORY', 'workingDirectory is required', 400);
		}
		if (!body.initialPrompt) {
			throw new CUIError('MISSING_INITIAL_PROMPT', 'initialPrompt is required', 400);
		}

		// Validate permissionMode
		if (body.permissionMode) {
			const validModes = ['acceptEdits', 'bypassPermissions', 'default', 'plan'];
			if (!validModes.includes(body.permissionMode)) {
				throw new CUIError(
					'INVALID_PERMISSION_MODE',
					`permissionMode must be one of: ${validModes.join(', ')}`,
					400
				);
			}
		}

		// Handle resume if resumedSessionId is provided
		let previousMessages: ConversationMessage[] = [];
		let inheritedPermissionMode: string | undefined;

		if (body.resumedSessionId) {
			try {
				previousMessages = await historyReader.fetchConversation(body.resumedSessionId);
			} catch {
				// Continue without previous messages
			}

			if (!body.permissionMode) {
				try {
					const sessionInfo = await sessionInfoService.getSessionInfo(body.resumedSessionId);
					inheritedPermissionMode = sessionInfo.permission_mode;
				} catch {
					// Continue without permission mode
				}
			}
		}

		const conversationConfig = {
			...body,
			previousMessages: previousMessages.length > 0 ? previousMessages : undefined,
			permissionMode: body.permissionMode || inheritedPermissionMode
		};

		const { streamingId, systemInit } = await agentService.startConversation(conversationConfig);

		// Update original session with continuation if resuming
		if (body.resumedSessionId) {
			try {
				await sessionInfoService.updateSessionInfo(body.resumedSessionId, {
					continuation_session_id: systemInit.session_id
				});
			} catch {
				// Non-fatal
			}

			try {
				conversationStatusManager.registerActiveSession(streamingId, systemInit.session_id, {
					initialPrompt: body.initialPrompt,
					workingDirectory: systemInit.cwd,
					model: systemInit.model,
					inheritedMessages: previousMessages.length > 0 ? previousMessages : undefined
				});
			} catch {
				// Non-fatal
			}
		}

		// Store permission mode in session info
		if (conversationConfig.permissionMode) {
			try {
				await sessionInfoService.updateSessionInfo(systemInit.session_id, {
					permission_mode: conversationConfig.permissionMode
				});
			} catch {
				// Non-fatal
			}
		}

		return json({
			streamingId,
			streamUrl: `/api/stream/${streamingId}`,
			sessionId: systemInit.session_id,
			cwd: systemInit.cwd,
			tools: systemInit.tools,
			mcpServers: systemInit.mcp_servers,
			model: systemInit.model,
			permissionMode: systemInit.permissionMode,
			apiKeySource: systemInit.apiKeySource
		});
	} catch (err) {
		if (err instanceof CUIError) {
			throw error(err.statusCode, err.message);
		}
		console.error('[api/conversations/start] POST error:', err);
		throw error(500, 'Failed to start conversation');
	}
};
