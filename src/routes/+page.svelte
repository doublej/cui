<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button, Input } from '$lib/components/ui/index.js';
	import { conversations, streamStore } from '$lib/stores/index.js';

	let workingDirectory = $state('');
	let initialPrompt = $state('');
	let isStarting = $state(false);
	let error = $state<string | null>(null);

	async function handleStart(): Promise<void> {
		if (!initialPrompt.trim()) return;

		isStarting = true;
		error = null;

		try {
			const response = await conversations.start({
				workingDirectory: workingDirectory || process.cwd?.() || '.',
				initialPrompt: initialPrompt.trim()
			});

			if (response) {
				// Connect to stream
				streamStore.connect(response.streamingId);
				// Navigate to conversation
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
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleStart();
		}
	}
</script>

<div class="flex h-full flex-col">
	<div class="flex flex-1 items-center justify-center p-8">
		<div class="w-full max-w-xl space-y-6">
			<div class="text-center">
				<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
					What can I help you with?
				</h1>
				<p class="mt-2 text-gray-600 dark:text-gray-400">
					Start a new conversation with Claude
				</p>
			</div>

			<div class="space-y-4">
				<Input
					bind:value={workingDirectory}
					placeholder="Working directory (optional)"
					disabled={isStarting}
				/>

				<div class="relative">
					<textarea
						bind:value={initialPrompt}
						placeholder="Ask Claude anything..."
						disabled={isStarting}
						onkeydown={handleKeydown}
						rows={4}
						class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 resize-none"
					></textarea>
				</div>

				{#if error}
					<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
				{/if}

				<Button
					variant="primary"
					size="lg"
					disabled={!initialPrompt.trim() || isStarting}
					onclick={handleStart}
					class="w-full"
				>
					{#if isStarting}
						Starting...
					{:else}
						Start Conversation
					{/if}
				</Button>
			</div>
		</div>
	</div>
</div>
