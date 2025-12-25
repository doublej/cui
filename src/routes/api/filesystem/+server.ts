import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServices } from '$lib/server/services/index.js';
import { CUIError } from '$lib/server/types/index.js';

// Helper to parse boolean query params
function parseBooleanParam(value: string | null): boolean | undefined {
	if (value === null) return undefined;
	if (value.toLowerCase() === 'true') return true;
	if (value.toLowerCase() === 'false') return false;
	return undefined;
}

// List directory contents - GET /api/filesystem?action=list&path=...
// Read file contents - GET /api/filesystem?action=read&path=...
export const GET: RequestHandler = async ({ url }) => {
	try {
		const { fileSystemService } = getServices();

		const action = url.searchParams.get('action');
		const path = url.searchParams.get('path');

		if (!path) {
			throw new CUIError('MISSING_PATH', 'path query parameter is required', 400);
		}

		if (action === 'list') {
			const recursive = parseBooleanParam(url.searchParams.get('recursive')) ?? false;
			const respectGitignore =
				parseBooleanParam(url.searchParams.get('respectGitignore')) ?? false;

			const result = await fileSystemService.listDirectory(path, recursive, respectGitignore);
			return json(result);
		} else if (action === 'read') {
			const result = await fileSystemService.readFile(path);
			return json(result);
		} else {
			throw new CUIError('INVALID_ACTION', 'action must be "list" or "read"', 400);
		}
	} catch (err) {
		if (err instanceof CUIError) {
			throw error(err.statusCode, err.message);
		}
		console.error('[api/filesystem] GET error:', err);
		throw error(500, 'Failed to perform filesystem operation');
	}
};
