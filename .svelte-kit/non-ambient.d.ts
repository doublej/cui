
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/config" | "/api/conversations" | "/api/conversations/archive-all" | "/api/conversations/start" | "/api/conversations/[streamingId]" | "/api/conversations/[sessionId]" | "/api/conversations/[sessionId]/rename" | "/api/conversations/[streamingId]/stop" | "/api/conversations/[sessionId]/update" | "/api/filesystem" | "/api/gemini" | "/api/gemini/health" | "/api/gemini/summarize" | "/api/gemini/transcribe" | "/api/logs" | "/api/logs/recent" | "/api/logs/stream" | "/api/notifications" | "/api/notifications/register" | "/api/notifications/status" | "/api/notifications/test" | "/api/notifications/unregister" | "/api/permissions" | "/api/permissions/notify" | "/api/permissions/[requestId]" | "/api/permissions/[requestId]/decision" | "/api/stream" | "/api/stream/[streamingId]" | "/api/system" | "/api/system/health" | "/api/working-directories" | "/c" | "/c/[sessionId]";
		RouteParams(): {
			"/api/conversations/[streamingId]": { streamingId: string };
			"/api/conversations/[sessionId]": { sessionId: string };
			"/api/conversations/[sessionId]/rename": { sessionId: string };
			"/api/conversations/[streamingId]/stop": { streamingId: string };
			"/api/conversations/[sessionId]/update": { sessionId: string };
			"/api/permissions/[requestId]": { requestId: string };
			"/api/permissions/[requestId]/decision": { requestId: string };
			"/api/stream/[streamingId]": { streamingId: string };
			"/c/[sessionId]": { sessionId: string }
		};
		LayoutParams(): {
			"/": { streamingId?: string; sessionId?: string; requestId?: string };
			"/api": { streamingId?: string; sessionId?: string; requestId?: string };
			"/api/config": Record<string, never>;
			"/api/conversations": { streamingId?: string; sessionId?: string };
			"/api/conversations/archive-all": Record<string, never>;
			"/api/conversations/start": Record<string, never>;
			"/api/conversations/[streamingId]": { streamingId: string };
			"/api/conversations/[sessionId]": { sessionId: string };
			"/api/conversations/[sessionId]/rename": { sessionId: string };
			"/api/conversations/[streamingId]/stop": { streamingId: string };
			"/api/conversations/[sessionId]/update": { sessionId: string };
			"/api/filesystem": Record<string, never>;
			"/api/gemini": Record<string, never>;
			"/api/gemini/health": Record<string, never>;
			"/api/gemini/summarize": Record<string, never>;
			"/api/gemini/transcribe": Record<string, never>;
			"/api/logs": Record<string, never>;
			"/api/logs/recent": Record<string, never>;
			"/api/logs/stream": Record<string, never>;
			"/api/notifications": Record<string, never>;
			"/api/notifications/register": Record<string, never>;
			"/api/notifications/status": Record<string, never>;
			"/api/notifications/test": Record<string, never>;
			"/api/notifications/unregister": Record<string, never>;
			"/api/permissions": { requestId?: string };
			"/api/permissions/notify": Record<string, never>;
			"/api/permissions/[requestId]": { requestId: string };
			"/api/permissions/[requestId]/decision": { requestId: string };
			"/api/stream": { streamingId?: string };
			"/api/stream/[streamingId]": { streamingId: string };
			"/api/system": Record<string, never>;
			"/api/system/health": Record<string, never>;
			"/api/working-directories": Record<string, never>;
			"/c": { sessionId?: string };
			"/c/[sessionId]": { sessionId: string }
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/config" | "/api/config/" | "/api/conversations" | "/api/conversations/" | "/api/conversations/archive-all" | "/api/conversations/archive-all/" | "/api/conversations/start" | "/api/conversations/start/" | `/api/conversations/${string}` & {} | `/api/conversations/${string}/` & {} | `/api/conversations/${string}/rename` & {} | `/api/conversations/${string}/rename/` & {} | `/api/conversations/${string}/stop` & {} | `/api/conversations/${string}/stop/` & {} | `/api/conversations/${string}/update` & {} | `/api/conversations/${string}/update/` & {} | "/api/filesystem" | "/api/filesystem/" | "/api/gemini" | "/api/gemini/" | "/api/gemini/health" | "/api/gemini/health/" | "/api/gemini/summarize" | "/api/gemini/summarize/" | "/api/gemini/transcribe" | "/api/gemini/transcribe/" | "/api/logs" | "/api/logs/" | "/api/logs/recent" | "/api/logs/recent/" | "/api/logs/stream" | "/api/logs/stream/" | "/api/notifications" | "/api/notifications/" | "/api/notifications/register" | "/api/notifications/register/" | "/api/notifications/status" | "/api/notifications/status/" | "/api/notifications/test" | "/api/notifications/test/" | "/api/notifications/unregister" | "/api/notifications/unregister/" | "/api/permissions" | "/api/permissions/" | "/api/permissions/notify" | "/api/permissions/notify/" | `/api/permissions/${string}` & {} | `/api/permissions/${string}/` & {} | `/api/permissions/${string}/decision` & {} | `/api/permissions/${string}/decision/` & {} | "/api/stream" | "/api/stream/" | `/api/stream/${string}` & {} | `/api/stream/${string}/` & {} | "/api/system" | "/api/system/" | "/api/system/health" | "/api/system/health/" | "/api/working-directories" | "/api/working-directories/" | "/c" | "/c/" | `/c/${string}` & {} | `/c/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}