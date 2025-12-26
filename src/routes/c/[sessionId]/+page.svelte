<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { MessageList, Composer } from '$lib/components/chat/index.js';
	import { conversations, streamStore, currentConversation } from '$lib/stores/index.js';
	import type { StreamEvent } from '$lib/server/types/index.js';

	const sessionId = $derived($page.params.sessionId);

	let isLoading = $state(true);
	let isStreaming = $state(false);
	let streamingId = $state<string | null>(null);
	let disconnectStream: (() => void) | null = null;

	onMount(async () => {
		if (!sessionId) {
			goto('/');
			return;
		}

		// Load conversation details
		const details = await conversations.fetchDetails(sessionId);
		isLoading = false;

		if (!details) {
			goto('/');
			return;
		}

		// Check if conversation is ongoing and connect to stream
		const conv = $conversations.list.find((c) => c.sessionId === sessionId);
		if (conv?.status === 'ongoing' && conv.streamingId) {
			streamingId = conv.streamingId;
			isStreaming = true;
			disconnectStream = streamStore.connect(conv.streamingId, handleStreamEvent);
		}
	});

	onDestroy(() => {
		if (disconnectStream) {
			disconnectStream();
		}
	});

	function handleStreamEvent(event: StreamEvent): void {
		if (event.type === 'result' || event.type === 'closed') {
			isStreaming = false;
			streamingId = null;
		}
	}

	async function handleSendMessage(message: string): Promise<void> {
		// For now, start a new conversation with the message as continuation
		// In a full implementation, this would send to an existing stream
		const response = await conversations.start({
			workingDirectory: $currentConversation?.projectPath || '.',
			initialPrompt: message,
			resumedSessionId: sessionId
		});

		if (response) {
			streamingId = response.streamingId;
			isStreaming = true;
			disconnectStream = streamStore.connect(response.streamingId, handleStreamEvent);
		}
	}

	async function handleStop(): Promise<void> {
		if (streamingId) {
			await conversations.stop(streamingId);
			isStreaming = false;
			streamingId = null;
		}
	}
</script>

<div class="flex h-full flex-col">
	{#if isLoading}
		<div class="flex flex-1 items-center justify-center">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
		</div>
	{:else}
		<MessageList
			messages={$conversations.currentMessages}
			loading={isStreaming}
		/>
		<Composer
			{isStreaming}
			onsubmit={handleSendMessage}
			onstop={handleStop}
		/>
	{/if}
</div>
