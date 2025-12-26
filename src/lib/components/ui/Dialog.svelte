<script lang="ts">
	import { createDialog, melt } from '@melt-ui/svelte';
	import { fade, fly } from 'svelte/transition';
	import type { Snippet } from 'svelte';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		title?: string;
		description?: string;
		children: Snippet;
		footer?: Snippet;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		title = '',
		description = '',
		children,
		footer
	}: Props = $props();

	const {
		elements: { trigger: _trigger, overlay, content, title: titleEl, description: descEl, close, portalled },
		states: { open: dialogOpen }
	} = createDialog({
		forceVisible: true,
		onOpenChange: ({ next }) => {
			open = next;
			onOpenChange?.(next);
			return next;
		}
	});

	$effect(() => {
		dialogOpen.set(open);
	});
</script>

<div use:melt={$portalled}>
	{#if $dialogOpen}
		<div
			use:melt={$overlay}
			class="fixed inset-0 z-50 bg-black/50"
			transition:fade={{ duration: 150 }}
		></div>
		<div
			use:melt={$content}
			class="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
			transition:fly={{ y: 8, duration: 150 }}
		>
			{#if title}
				<h2 use:melt={$titleEl} class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
					{title}
				</h2>
			{/if}
			{#if description}
				<p use:melt={$descEl} class="mb-4 text-sm text-gray-600 dark:text-gray-400">
					{description}
				</p>
			{/if}
			<div class="mb-4">
				{@render children()}
			</div>
			{#if footer}
				<div class="flex justify-end gap-2">
					{@render footer()}
				</div>
			{/if}
			<button
				use:melt={$close}
				class="absolute right-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
				aria-label="Close"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/if}
</div>
