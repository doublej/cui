<script lang="ts">
	import type { ConversationSummary } from '$lib/server/types/index.js';
	import TaskItem from './TaskItem.svelte';
	import type { TabType } from './TaskTabs.svelte';

	interface Props {
		conversations: ConversationSummary[];
		loading: boolean;
		activeTab: TabType;
	}

	let { conversations, loading, activeTab }: Props = $props();

	const filteredConversations = $derived(() => {
		switch (activeTab) {
			case 'tasks':
				return conversations.filter(
					(c) => !c.sessionInfo?.archived && !c.sessionInfo?.continuation_session_id
				);
			case 'history':
				return conversations.filter((c) => c.sessionInfo?.continuation_session_id);
			case 'archive':
				return conversations.filter((c) => c.sessionInfo?.archived);
			default:
				return conversations;
		}
	});

	const emptyMessage = $derived(() => {
		switch (activeTab) {
			case 'tasks':
				return 'No active tasks';
			case 'history':
				return 'No conversation history';
			case 'archive':
				return 'No archived conversations';
			default:
				return 'No conversations';
		}
	});
</script>

<div class="flex-1 overflow-y-auto pb-4">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
		</div>
	{:else if filteredConversations().length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
			<svg class="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
			</svg>
			<p>{emptyMessage()}</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each filteredConversations() as conversation (conversation.sessionId)}
				<TaskItem {conversation} />
			{/each}
		</div>
	{/if}
</div>
