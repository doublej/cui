export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.Bcpew2fe.js",app:"_app/immutable/entry/app.BBCdoOXr.js",imports:["_app/immutable/entry/start.Bcpew2fe.js","_app/immutable/chunks/amH-GrG7.js","_app/immutable/chunks/DhSEWgK2.js","_app/immutable/entry/app.BBCdoOXr.js","_app/immutable/chunks/DhSEWgK2.js","_app/immutable/chunks/BhmXg9OM.js","_app/immutable/chunks/BrxLUt4X.js","_app/immutable/chunks/D3MjyZ-p.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/config",
				pattern: /^\/api\/config\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/config/_server.ts.js'))
			},
			{
				id: "/api/conversations",
				pattern: /^\/api\/conversations\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/conversations/_server.ts.js'))
			},
			{
				id: "/api/conversations/archive-all",
				pattern: /^\/api\/conversations\/archive-all\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/conversations/archive-all/_server.ts.js'))
			},
			{
				id: "/api/conversations/start",
				pattern: /^\/api\/conversations\/start\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/conversations/start/_server.ts.js'))
			},
			{
				id: "/api/conversations/[sessionId]",
				pattern: /^\/api\/conversations\/([^/]+?)\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/conversations/_sessionId_/_server.ts.js'))
			},
			{
				id: "/api/conversations/[sessionId]/rename",
				pattern: /^\/api\/conversations\/([^/]+?)\/rename\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/conversations/_sessionId_/rename/_server.ts.js'))
			},
			{
				id: "/api/conversations/[streamingId]/stop",
				pattern: /^\/api\/conversations\/([^/]+?)\/stop\/?$/,
				params: [{"name":"streamingId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/conversations/_streamingId_/stop/_server.ts.js'))
			},
			{
				id: "/api/conversations/[sessionId]/update",
				pattern: /^\/api\/conversations\/([^/]+?)\/update\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/conversations/_sessionId_/update/_server.ts.js'))
			},
			{
				id: "/api/filesystem",
				pattern: /^\/api\/filesystem\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/filesystem/_server.ts.js'))
			},
			{
				id: "/api/gemini/health",
				pattern: /^\/api\/gemini\/health\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/gemini/health/_server.ts.js'))
			},
			{
				id: "/api/gemini/summarize",
				pattern: /^\/api\/gemini\/summarize\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/gemini/summarize/_server.ts.js'))
			},
			{
				id: "/api/gemini/transcribe",
				pattern: /^\/api\/gemini\/transcribe\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/gemini/transcribe/_server.ts.js'))
			},
			{
				id: "/api/logs/recent",
				pattern: /^\/api\/logs\/recent\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/logs/recent/_server.ts.js'))
			},
			{
				id: "/api/logs/stream",
				pattern: /^\/api\/logs\/stream\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/logs/stream/_server.ts.js'))
			},
			{
				id: "/api/notifications/register",
				pattern: /^\/api\/notifications\/register\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/notifications/register/_server.ts.js'))
			},
			{
				id: "/api/notifications/status",
				pattern: /^\/api\/notifications\/status\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/notifications/status/_server.ts.js'))
			},
			{
				id: "/api/notifications/test",
				pattern: /^\/api\/notifications\/test\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/notifications/test/_server.ts.js'))
			},
			{
				id: "/api/notifications/unregister",
				pattern: /^\/api\/notifications\/unregister\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/notifications/unregister/_server.ts.js'))
			},
			{
				id: "/api/permissions",
				pattern: /^\/api\/permissions\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/permissions/_server.ts.js'))
			},
			{
				id: "/api/permissions/notify",
				pattern: /^\/api\/permissions\/notify\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/permissions/notify/_server.ts.js'))
			},
			{
				id: "/api/permissions/[requestId]/decision",
				pattern: /^\/api\/permissions\/([^/]+?)\/decision\/?$/,
				params: [{"name":"requestId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/permissions/_requestId_/decision/_server.ts.js'))
			},
			{
				id: "/api/stream/[streamingId]",
				pattern: /^\/api\/stream\/([^/]+?)\/?$/,
				params: [{"name":"streamingId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stream/_streamingId_/_server.ts.js'))
			},
			{
				id: "/api/system/health",
				pattern: /^\/api\/system\/health\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/system/health/_server.ts.js'))
			},
			{
				id: "/api/working-directories",
				pattern: /^\/api\/working-directories\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/working-directories/_server.ts.js'))
			},
			{
				id: "/c/[sessionId]",
				pattern: /^\/c\/([^/]+?)\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
