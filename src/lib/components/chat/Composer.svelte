<script lang="ts">
	import { Button, Textarea } from '$lib/components/ui/index.js';

	interface Props {
		disabled?: boolean;
		onsubmit?: (message: string) => void;
		onstop?: () => void;
		isStreaming?: boolean;
	}

	let { disabled = false, onsubmit, onstop, isStreaming = false }: Props = $props();

	let message = $state('');

	function handleSubmit(): void {
		const trimmed = message.trim();
		if (!trimmed || disabled) return;
		onsubmit?.(trimmed);
		message = '';
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}
</script>

<div class="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
	<div class="mx-auto flex max-w-3xl gap-2">
		<Textarea
			bind:value={message}
			placeholder="Type your message..."
			disabled={disabled || isStreaming}
			onkeydown={handleKeydown}
			rows={1}
			class="min-h-[44px] flex-1 resize-none"
		/>
		{#if isStreaming}
			<Button variant="danger" onclick={() => onstop?.()}>
				Stop
			</Button>
		{:else}
			<Button
				variant="primary"
				disabled={disabled || !message.trim()}
				onclick={handleSubmit}
			>
				Send
			</Button>
		{/if}
	</div>
</div>
