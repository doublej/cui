<script lang="ts">
	import type Anthropic from '@anthropic-ai/sdk';
	import { BashTool, ReadTool, WriteTool, EditTool, SearchTool } from './tools/index.js';

	interface Props {
		tool: Anthropic.ToolUseBlock;
		result?: string;
	}

	let { tool, result }: Props = $props();

	const input = $derived(tool.input as Record<string, unknown>);

	const toolType = $derived(() => {
		switch (tool.name) {
			case 'Bash':
				return 'bash';
			case 'Read':
				return 'read';
			case 'Write':
				return 'write';
			case 'Edit':
				return 'edit';
			case 'Grep':
			case 'Glob':
				return 'search';
			default:
				return 'other';
		}
	});
</script>

{#if toolType() === 'bash'}
	<BashTool
		command={String(input.command || '')}
		output={result}
	/>
{:else if toolType() === 'read'}
	<ReadTool
		filePath={String(input.file_path || input.path || '')}
		content={result}
	/>
{:else if toolType() === 'write'}
	<WriteTool
		filePath={String(input.file_path || '')}
		content={String(input.content || '')}
	/>
{:else if toolType() === 'edit'}
	<EditTool
		filePath={String(input.file_path || '')}
		oldString={String(input.old_string || '')}
		newString={String(input.new_string || '')}
	/>
{:else if toolType() === 'search'}
	<SearchTool
		pattern={String(input.pattern || '')}
		path={String(input.path || '')}
		results={result ? result.split('\n').filter(Boolean) : []}
	/>
{:else}
	<!-- Fallback for other tools -->
	<div class="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
		<div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800">
			<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{tool.name}</span>
		</div>
		{#if Object.keys(input).length > 0}
			<div class="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
				<pre class="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{JSON.stringify(input, null, 2)}</pre>
			</div>
		{/if}
	</div>
{/if}
