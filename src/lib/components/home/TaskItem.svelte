<script lang="ts">
	import type { ConversationSummary } from '$lib/server/types/index.js';
	import { goto } from '$app/navigation';

	interface Props {
		conversation: ConversationSummary;
	}

	let { conversation }: Props = $props();

	const displayName = $derived(
		conversation.sessionInfo?.custom_name || conversation.summary || 'Untitled conversation'
	);

	const projectName = $derived(conversation.projectPath.split('/').pop() || conversation.projectPath);

	const isOngoing = $derived(conversation.status === 'ongoing');

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString();
	}

	function formatDuration(ms: number): string {
		if (ms < 1000) return '<1s';
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		return `${hours}h ${minutes % 60}m`;
	}

	function handleClick(): void {
		goto(`/c/${conversation.sessionId}`);
	}
</script>

<button
	class="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
	onclick={handleClick}
>
	<div class="flex items-start justify-between gap-3">
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				{#if isOngoing}
					<span class="flex h-2 w-2">
						<span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
					</span>
				{/if}
				{#if conversation.sessionInfo?.pinned}
					<svg class="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
						<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
					</svg>
				{/if}
				<span class="font-medium text-gray-900 dark:text-gray-100 truncate">
					{displayName}
				</span>
			</div>
			<div class="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
				<span class="truncate">{projectName}</span>
				<span>-</span>
				<span>{formatDate(conversation.updatedAt)}</span>
				{#if conversation.totalDuration > 0}
					<span>-</span>
					<span>{formatDuration(conversation.totalDuration)}</span>
				{/if}
			</div>
		</div>
		<div class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
			<span>{conversation.messageCount} msgs</span>
			{#if conversation.toolMetrics}
				<span class="text-green-600">+{conversation.toolMetrics.linesAdded}</span>
				<span class="text-red-600">-{conversation.toolMetrics.linesRemoved}</span>
			{/if}
		</div>
	</div>
</button>
