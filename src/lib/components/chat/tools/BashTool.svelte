<script lang="ts">
	interface Props {
		command: string;
		output?: string;
	}

	let { command, output }: Props = $props();
</script>

<div class="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
	<div class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
		<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
		</svg>
		<span class="text-xs font-medium text-gray-600 dark:text-gray-400">Bash</span>
	</div>
	<div class="p-3 bg-gray-900 text-gray-100 font-mono text-sm">
		<div class="flex items-start gap-2">
			<span class="text-green-400 select-none">$</span>
			<pre class="flex-1 whitespace-pre-wrap break-all">{command}</pre>
		</div>
		{#if output}
			<div class="mt-2 pt-2 border-t border-gray-700 text-gray-300 whitespace-pre-wrap break-all">
				{output}
			</div>
		{/if}
	</div>
</div>
