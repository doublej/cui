<script lang="ts">
	import { conversations } from '$lib/stores/index.js';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/index.js';
	import type { ConversationSummary } from '$lib/server/types/index.js';

	interface Props {
		currentSessionId?: string;
	}

	let { currentSessionId }: Props = $props();

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;
		return date.toLocaleDateString();
	}

	function getDisplayName(conv: ConversationSummary): string {
		if (conv.sessionInfo?.custom_name) return conv.sessionInfo.custom_name;
		return conv.summary || 'Untitled conversation';
	}

	function handleNewChat(): void {
		goto('/');
	}

	function handleSelectConversation(sessionId: string): void {
		goto(`/c/${sessionId}`);
	}
</script>

<div class="flex h-full flex-col">
	<div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
		<h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">CUI</h1>
		<Button variant="primary" size="sm" onclick={handleNewChat}>
			New Chat
		</Button>
	</div>

	<div class="flex-1 overflow-y-auto p-2">
		{#if $conversations.loading}
			<div class="flex items-center justify-center py-8">
				<div class="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
			</div>
		{:else if $conversations.list.length === 0}
			<p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
				No conversations yet
			</p>
		{:else}
			<ul class="space-y-1">
				{#each $conversations.list as conv (conv.sessionId)}
					<li>
						<button
							class="w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
							class:bg-gray-100={conv.sessionId === currentSessionId}
							class:dark:bg-gray-700={conv.sessionId === currentSessionId}
							onclick={() => handleSelectConversation(conv.sessionId)}
						>
							<div class="flex items-center gap-2">
								{#if conv.status === 'ongoing'}
									<span class="h-2 w-2 rounded-full bg-green-500"></span>
								{/if}
								<span class="flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
									{getDisplayName(conv)}
								</span>
							</div>
							<div class="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
								<span>{formatDate(conv.updatedAt)}</span>
								<span class="truncate">{conv.projectPath.split('/').pop()}</span>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
