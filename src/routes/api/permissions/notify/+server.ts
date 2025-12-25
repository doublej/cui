import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';
import { CUIError } from '$lib/server/types/index.js';

// Permission notification - called by MCP server when permission is requested
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { permissionTracker } = getServices();
		const { toolName, toolInput, streamingId } = await request.json();

		if (!toolName) {
			throw new CUIError('MISSING_TOOL_NAME', 'toolName is required', 400);
		}

		const permissionRequest = permissionTracker.addPermissionRequest(toolName, toolInput, streamingId);

		return json({ success: true, id: permissionRequest.id });
	} catch (err) {
		if (err instanceof CUIError) {
			throw error(err.statusCode, err.message);
		}
		console.error('[api/permissions/notify] POST error:', err);
		throw error(500, 'Failed to notify permission');
	}
};
