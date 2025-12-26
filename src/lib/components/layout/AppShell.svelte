<script lang="ts">
	import type { Snippet } from 'svelte';
	import { effectiveTheme } from '$lib/stores/index.js';

	interface Props {
		sidebar?: Snippet;
		children: Snippet;
	}

	let { sidebar, children }: Props = $props();
	let sidebarOpen = $state(true);
</script>

<div class="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900" class:dark={$effectiveTheme === 'dark'}>
	{#if sidebar}
		<aside
			class="flex h-full w-72 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 transition-transform duration-200"
			class:-translate-x-full={!sidebarOpen}
			class:translate-x-0={sidebarOpen}
		>
			{@render sidebar()}
		</aside>
	{/if}
	<main class="flex flex-1 flex-col overflow-hidden">
		{@render children()}
	</main>
</div>
