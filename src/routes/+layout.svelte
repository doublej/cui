<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { AppShell, Sidebar } from '$lib/components/layout/index.js';
	import { conversations, authToken, isAuthenticated, effectiveTheme } from '$lib/stores/index.js';

	let { children } = $props();

	// Get current session ID from URL
	const currentSessionId = $derived(
		$page.url.pathname.startsWith('/c/') ? $page.params.sessionId : undefined
	);

	onMount(async () => {
		// Check for token in URL hash (initial auth)
		const hash = window.location.hash;
		if (hash.startsWith('#token=')) {
			const token = hash.slice(7);
			authToken.setToken(token);
			window.history.replaceState(null, '', window.location.pathname);
		}

		// Load conversations if authenticated
		if ($isAuthenticated) {
			await conversations.fetchList();
		}
	});

	// Apply theme class to document
	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', $effectiveTheme === 'dark');
		}
	});
</script>

<svelte:head>
	<title>CUI</title>
</svelte:head>

{#if !$isAuthenticated}
	<div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">CUI</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Please use the authenticated URL to access CUI.
			</p>
		</div>
	</div>
{:else}
	<AppShell>
		{#snippet sidebar()}
			<Sidebar {currentSessionId} />
		{/snippet}
		{@render children()}
	</AppShell>
{/if}
