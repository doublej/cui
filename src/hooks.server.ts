import type { Handle } from '@sveltejs/kit';
import { initializeServices, getServices } from '$lib/server/services/index.js';

// Initialize services on first request
let initialized = false;

async function initServices(): Promise<void> {
	if (initialized) return;

	try {
		await initializeServices();
		initialized = true;
		console.log('[hooks.server] Services initialized');
	} catch (error) {
		console.error('[hooks.server] Failed to initialize services:', error);
		throw error;
	}
}

// Public paths that don't require authentication
const PUBLIC_PATHS = [
	'/api/system/health',
	'/api/permissions',
	'/api/notifications'
];

function isPublicPath(pathname: string): boolean {
	return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize services on first request
	await initServices();

	// Add request ID
	event.locals.requestId = crypto.randomUUID();

	// Skip auth for non-API routes and public paths
	if (!event.url.pathname.startsWith('/api') || isPublicPath(event.url.pathname)) {
		return resolve(event);
	}

	// Check authentication for API routes
	const authHeader = event.request.headers.get('authorization');
	const token = authHeader?.replace('Bearer ', '');

	try {
		const { configService } = getServices();
		const config = configService.getConfig();

		if (token !== config.authToken) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	} catch {
		// Config not ready, allow request to proceed for now
		console.warn('[hooks.server] Config not available for auth check');
	}

	return resolve(event);
};
