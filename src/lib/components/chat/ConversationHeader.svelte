<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/index.js';
	import { conversations } from '$lib/stores/index.js';
	import type { ConversationSummary } from '$lib/server/types/index.js';

	interface Props {
		conversation: ConversationSummary | undefined;
		isStreaming: boolean;
		onStop?: () => void;
	}

	let { conversation, isStreaming, onStop }: Props = $props();

	let isEditing = $state(false);
	let editName = $state('');

	const displayName = $derived(
		conversation?.sessionInfo?.custom_name || conversation?.summary || 'Conversation'
	);

	function startEditing(): void {
		editName = displayName;
		isEditing = true;
	}

	async function saveName(): Promise<void> {
		if (conversation && editName.trim()) {
			await conversations.rename(conversation.sessionId, editName.trim());
		}
		isEditing = false;
	}

	function cancelEditing(): void {
		isEditing = false;
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter') {
			saveName();
		} else if (e.key === 'Escape') {
			cancelEditing();
		}
	}

	async function togglePin(): Promise<void> {
		if (conversation) {
			await conversations.updateSession(conversation.sessionId, {
				pinned: !conversation.sessionInfo?.pinned
			});
		}
	}

	async function toggleArchive(): Promise<void> {
		if (conversation) {
			await conversations.updateSession(conversation.sessionId, {
				archived: !conversation.sessionInfo?.archived
			});
			if (!conversation.sessionInfo?.archived) {
				goto('/');
			}
		}
	}

	function goBack(): void {
		goto('/');
	}
</script>

<header class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
	<div class="flex items-center gap-3">
		<button
			class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
			onclick={goBack}
			title="Back to home"
		>
			<svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>

		{#if isEditing}
			<input
				bind:value={editName}
				onkeydown={handleKeydown}
				onblur={saveName}
				class="px-2 py-1 text-lg font-medium border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
				autofocus
			/>
		{:else}
			<button
				class="text-lg font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
				onclick={startEditing}
				title="Click to rename"
			>
				{displayName}
			</button>
		{/if}

		{#if isStreaming}
			<span class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium">
				<span class="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
				Running
			</span>
		{/if}
	</div>

	<div class="flex items-center gap-1">
		{#if isStreaming && onStop}
			<Button variant="danger" size="sm" onclick={onStop}>
				<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
				</svg>
				Stop
			</Button>
		{/if}

		<button
			class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
			class:text-yellow-500={conversation?.sessionInfo?.pinned}
			class:text-gray-400={!conversation?.sessionInfo?.pinned}
			onclick={togglePin}
			title={conversation?.sessionInfo?.pinned ? 'Unpin' : 'Pin'}
		>
			<svg class="w-5 h-5" fill={conversation?.sessionInfo?.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
			</svg>
		</button>

		<button
			class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
			onclick={toggleArchive}
			title={conversation?.sessionInfo?.archived ? 'Unarchive' : 'Archive'}
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
			</svg>
		</button>
	</div>
</header>
