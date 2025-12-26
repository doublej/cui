<script lang="ts">
	import type Anthropic from '@anthropic-ai/sdk';

	interface Props {
		tool: Anthropic.ToolUseBlock;
	}

	let { tool }: Props = $props();

	const toolDisplayNames: Record<string, string> = {
		Read: 'Reading file',
		Write: 'Writing file',
		Edit: 'Editing file',
		Bash: 'Running command',
		Glob: 'Finding files',
		Grep: 'Searching files',
		Task: 'Running task',
		WebFetch: 'Fetching URL',
		WebSearch: 'Searching web'
	};

	function getToolDisplay(name: string): string {
		return toolDisplayNames[name] || name;
	}

	function getToolSummary(name: string, input: Record<string, unknown>): string {
		switch (name) {
			case 'Read':
			case 'Write':
			case 'Edit':
				return String(input.file_path || input.path || '');
			case 'Bash':
				return String(input.command || '').slice(0, 50);
			case 'Glob':
				return String(input.pattern || '');
			case 'Grep':
				return String(input.pattern || '');
			case 'WebFetch':
				return String(input.url || '');
			case 'WebSearch':
				return String(input.query || '');
			default:
				return '';
		}
	}

	const display = $derived(getToolDisplay(tool.name));
	const summary = $derived(getToolSummary(tool.name, tool.input as Record<string, unknown>));
</script>

<div class="rounded border border-gray-200 bg-white p-2 text-sm dark:border-gray-600 dark:bg-gray-800">
	<div class="flex items-center gap-2">
		<span class="font-medium text-gray-700 dark:text-gray-300">{display}</span>
		{#if summary}
			<code class="truncate rounded bg-gray-100 px-1 text-xs dark:bg-gray-700">
				{summary}
			</code>
		{/if}
	</div>
</div>
