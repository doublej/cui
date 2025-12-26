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

<div class="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
	<button
		class="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
		onclick={() => (isExpanded = !isExpanded)}
	>
		<div class="flex items-center gap-2">
			<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName}</span>
			{#if lineCount > 0}
				<span class="text-xs text-gray-500">({lineCount} lines)</span>
			{/if}
		</div>
		<svg
			class="w-4 h-4 text-gray-400 transition-transform"
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

	<div class="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
		<code class="text-xs text-gray-500 dark:text-gray-400 truncate block">{filePath}</code>
	</div>
</div>
