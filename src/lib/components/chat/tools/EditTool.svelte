<script lang="ts">
	interface Props {
		filePath: string;
		oldString?: string;
		newString?: string;
	}

	let { filePath, oldString, newString }: Props = $props();

	let isExpanded = $state(false);

	const fileName = $derived(filePath.split('/').pop() || filePath);
</script>

<div class="rounded-md border border-yellow-200 dark:border-yellow-800 overflow-hidden">
	<button
		class="w-full flex items-center justify-between gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
		onclick={() => (isExpanded = !isExpanded)}
	>
		<div class="flex items-center gap-2">
			<svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
			</svg>
			<span class="text-sm font-medium text-yellow-700 dark:text-yellow-300">Edited {fileName}</span>
		</div>
		<svg
			class="w-4 h-4 text-yellow-400 transition-transform"
			class:rotate-180={isExpanded}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isExpanded && (oldString || newString)}
		<div class="max-h-96 overflow-auto">
			{#if oldString}
				<div class="p-3 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
					<div class="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Removed:</div>
					<pre class="text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap">{oldString}</pre>
				</div>
			{/if}
			{#if newString}
				<div class="p-3 bg-green-50 dark:bg-green-900/20">
					<div class="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Added:</div>
					<pre class="text-xs font-mono text-green-700 dark:text-green-300 whitespace-pre-wrap">{newString}</pre>
				</div>
			{/if}
		</div>
	{/if}

	<div class="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/50 border-t border-yellow-200 dark:border-yellow-800">
		<code class="text-xs text-yellow-600 dark:text-yellow-400 truncate block">{filePath}</code>
	</div>
</div>
