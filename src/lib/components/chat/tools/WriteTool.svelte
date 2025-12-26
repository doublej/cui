<script lang="ts">
	interface Props {
		filePath: string;
		content?: string;
	}

	let { filePath, content }: Props = $props();

	let isExpanded = $state(false);

	const fileName = $derived(filePath.split('/').pop() || filePath);
	const lineCount = $derived(content ? content.split('\n').length : 0);
</script>

<div class="rounded-md border border-green-200 dark:border-green-800 overflow-hidden">
	<button
		class="w-full flex items-center justify-between gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
		onclick={() => (isExpanded = !isExpanded)}
	>
		<div class="flex items-center gap-2">
			<svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
			</svg>
			<span class="text-sm font-medium text-green-700 dark:text-green-300">Created {fileName}</span>
			{#if lineCount > 0}
				<span class="text-xs text-green-600 dark:text-green-400">({lineCount} lines)</span>
			{/if}
		</div>
		<svg
			class="w-4 h-4 text-green-400 transition-transform"
			class:rotate-180={isExpanded}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isExpanded && content}
		<div class="max-h-96 overflow-auto">
			<pre class="p-3 text-xs font-mono text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 whitespace-pre-wrap">{content}</pre>
		</div>
	{/if}

	<div class="px-3 py-1.5 bg-green-100 dark:bg-green-900/50 border-t border-green-200 dark:border-green-800">
		<code class="text-xs text-green-600 dark:text-green-400 truncate block">{filePath}</code>
	</div>
</div>
