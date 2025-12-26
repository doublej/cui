<script lang="ts">
	import type { ConversationMessage } from '$lib/server/types/index.js';
	import ToolRenderer from './ToolRenderer.svelte';
	import type Anthropic from '@anthropic-ai/sdk';

	interface Props {
		message: ConversationMessage;
	}

	let { message }: Props = $props();

	const isUser = $derived(message.type === 'user');

	function getTextContent(msg: Anthropic.Message | Anthropic.MessageParam): string {
		if ('content' in msg) {
			if (typeof msg.content === 'string') return msg.content;
			if (Array.isArray(msg.content)) {
				return msg.content
					.filter((block): block is Anthropic.TextBlock | Anthropic.TextBlockParam =>
						block.type === 'text'
					)
					.map((block) => block.text)
					.join('\n');
			}
		}
		return '';
	}

	function getToolUseBlocks(msg: Anthropic.Message | Anthropic.MessageParam): Anthropic.ToolUseBlock[] {
		if ('content' in msg && Array.isArray(msg.content)) {
			return msg.content.filter(
				(block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
			);
		}
		return [];
	}

	const textContent = $derived(getTextContent(message.message));
	const toolBlocks = $derived(getToolUseBlocks(message.message));
</script>

<div class="flex gap-3 py-4" class:justify-end={isUser}>
	<div
		class="flex max-w-[80%] flex-col gap-2 rounded-lg px-4 py-2"
		class:bg-blue-600={isUser}
		class:text-white={isUser}
		class:bg-gray-100={!isUser}
		class:dark:bg-gray-700={!isUser}
		class:text-gray-900={!isUser}
		class:dark:text-gray-100={!isUser}
	>
		{#if textContent}
			<div class="whitespace-pre-wrap text-sm">
				{textContent}
			</div>
		{/if}

		{#if toolBlocks.length > 0}
			<div class="space-y-2">
				{#each toolBlocks as tool (tool.id)}
					<ToolRenderer {tool} />
				{/each}
			</div>
		{/if}

		<div class="text-xs opacity-60">
			{new Date(message.timestamp).toLocaleTimeString()}
		</div>
	</div>
</div>
