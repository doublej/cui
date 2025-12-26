import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	server: {
		port: 5173,
		host: '0.0.0.0'
	},
	build: {
		rollupOptions: {
			external: ['web-push', 'better-sqlite3', '@musistudio/llms']
		}
	},
	ssr: {
		external: ['web-push', 'better-sqlite3', '@musistudio/llms'],
		noExternal: []
	}
});
