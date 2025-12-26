<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Textarea } from '$lib/components/ui/index.js';
	import { Button } from '$lib/components/ui/index.js';
	import { TaskTabs, TaskList, WorkingDirectorySelector } from '$lib/components/home/index.js';
	import { conversations, streamStore } from '$lib/stores/index.js';
	import type { TabType } from '$lib/components/home/TaskTabs.svelte';

	let workingDirectory = $state('');
	let initialPrompt = $state('');
	let isStarting = $state(false);
	let error = $state<string | null>(null);
	let activeTab = $state<TabType>('tasks');

	onMount(() => {
		conversations.fetchList();
	});

	async function handleStart(): Promise<void> {
		if (!initialPrompt.trim()) return;

		isStarting = true;
		error = null;

		try {
			const response = await conversations.start({
				workingDirectory: workingDirectory || '.',
				initialPrompt: initialPrompt.trim()
			});

			if (response) {
				streamStore.connect(response.streamingId);
				goto(`/c/${response.sessionId}`);
			} else {
				error = 'Failed to start conversation';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to start conversation';
		} finally {
			isStarting = false;
		}
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && !e.shiftKey && initialPrompt.trim()) {
			e.preventDefault();
			handleStart();
		}
	}

	function handleDirectoryChange(dir: string): void {
		workingDirectory = dir;
	}

	function handleTabChange(tab: TabType): void {
		activeTab = tab;
	}
</script>

<div class="flex h-full flex-col">
	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-3xl px-4 py-8">
			<!-- Header -->
			<div class="flex items-center gap-3 mb-6">
				<div class="w-7 h-7 flex items-center justify-center text-gray-900 dark:text-gray-100">
					<svg width="24" height="24" viewBox="4.5 5.2 11.7 13.3" fill="currentColor">
						<circle cx="10.3613" cy="6.44531" r="1.03516" />
						<circle cx="5.69336" cy="9.15039" r="1.03516" />
						<circle cx="15.0195" cy="9.15039" r="1.03516" />
						<circle cx="5.69336" cy="14.5801" r="1.03516" />
						<circle cx="15.0195" cy="14.5801" r="1.03516" />
						<circle cx="10.3613" cy="17.2754" r="1.03516" />
						<path d="M10.3613 13.4961C11.2695 13.4961 11.9922 12.7734 11.9922 11.8652C11.9922 10.9668 11.25 10.2344 10.3613 10.2344C9.47266 10.2344 8.73047 10.9766 8.73047 11.8652C8.73047 12.7539 9.46289 13.4961 10.3613 13.4961Z" />
					</svg>
				</div>
				<h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
					What is the next task?
				</h1>
			</div>

			<!-- Composer -->
			<div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
				<!-- Working Directory Selector -->
				<div class="mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
					<WorkingDirectorySelector
						bind:value={workingDirectory}
						onchange={handleDirectoryChange}
					/>
				</div>

				<!-- Prompt Input -->
				<Textarea
					bind:value={initialPrompt}
					placeholder="Describe your task..."
					disabled={isStarting}
					onkeydown={handleKeydown}
					rows={3}
					class="border-0 p-0 focus:ring-0 resize-none"
				/>

				{#if error}
					<p class="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
				{/if}

				<!-- Submit Button -->
				<div class="mt-3 flex justify-end">
					<Button
						variant="primary"
						disabled={!initialPrompt.trim() || isStarting}
						onclick={handleStart}
					>
						{#if isStarting}
							<span class="flex items-center gap-2">
								<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
								Starting...
							</span>
						{:else}
							Start Task
						{/if}
					</Button>
				</div>
			</div>

			<!-- Task Tabs -->
			<TaskTabs {activeTab} onTabChange={handleTabChange} />

			<!-- Task List -->
			<TaskList
				conversations={$conversations.list}
				loading={$conversations.loading}
				{activeTab}
			/>
		</div>
	</div>
</div>
