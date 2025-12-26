<script lang="ts">
	interface Props {
		pattern: string;
		path?: string;
		results?: string[];
	}

	let { pattern, path, results = [] }: Props = $props();

	let isExpanded = $state(false);
</script>

<div class="rounded-md border border-purple-200 dark:border-purple-800 overflow-hidden">
	<button
		class="w-full flex items-center justify-between gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
		onclick={() => (isExpanded = !isExpanded)}
	>
		<div class="flex items-center gap-2">
			<svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<span class="text-sm font-medium text-purple-700 dark:text-purple-300">Search: {pattern}</span>
			{#if results.length > 0}
				<span class="text-xs text-purple-600 dark:text-purple-400">({results.length} results)</span>
			{/if}
		</div>
		<svg
			class="w-4 h-4 text-purple-400 transition-transform"
			class:rotate-180={isExpanded}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isExpanded && results.length > 0}
		<div class="max-h-96 overflow-auto p-3 bg-gray-50 dark:bg-gray-900">
			<ul class="space-y-1">
				{#each results as result, i (i)}
					<li class="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">{result}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if path}
		<div class="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/50 border-t border-purple-200 dark:border-purple-800">
			<code class="text-xs text-purple-600 dark:text-purple-400 truncate block">{path}</code>
		</div>
	{/if}
</div>
