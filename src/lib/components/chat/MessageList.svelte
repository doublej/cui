<script lang="ts">
	import type { ConversationMessage } from '$lib/server/types/index.js';
	import Message from './Message.svelte';

	interface Props {
		messages: ConversationMessage[];
		loading?: boolean;
	}

	let { messages, loading = false }: Props = $props();

	let containerEl: HTMLDivElement | undefined = $state();

	// Auto-scroll to bottom when new messages arrive
	$effect(() => {
		if (messages.length > 0 && containerEl) {
			containerEl.scrollTop = containerEl.scrollHeight;
		}
	});
</script>

<div
	bind:this={containerEl}
	class="flex-1 overflow-y-auto px-4"
>
	{#if messages.length === 0 && !loading}
		<div class="flex h-full items-center justify-center">
			<p class="text-gray-500 dark:text-gray-400">Start a conversation</p>
		</div>
	{:else}
		<div class="mx-auto max-w-3xl py-4">
			{#each messages as message (message.uuid)}
				<Message {message} />
			{/each}

			{#if loading}
				<div class="flex items-center gap-2 py-4">
					<div class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay: 0ms"></div>
					<div class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay: 150ms"></div>
					<div class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay: 300ms"></div>
				</div>
			{/if}
		</div>
	{/if}
</div>
