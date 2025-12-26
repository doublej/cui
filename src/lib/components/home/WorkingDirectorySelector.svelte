<script lang="ts">
	import { createCombobox, melt } from '@melt-ui/svelte';
	import type { WorkingDirectory } from '$lib/server/types/index.js';
	import { authToken } from '$lib/stores/index.js';
	import { get } from 'svelte/store';

	interface Props {
		value: string;
		onchange: (value: string) => void;
	}

	let { value = $bindable(), onchange }: Props = $props();

	let directories = $state<WorkingDirectory[]>([]);
	let _loading = $state(false);

	async function loadDirectories(): Promise<void> {
		_loading = true;
		try {
			const token = get(authToken);
			const res = await fetch('/api/working-directories', {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (res.ok) {
				const data = await res.json();
				directories = data.directories || [];
			}
		} catch {
			// Ignore errors
		} finally {
			_loading = false;
		}
	}

	$effect(() => {
		loadDirectories();
	});

	const {
		elements: { menu, input, option },
		states: { open, inputValue }
	} = createCombobox<string>({
		forceVisible: true,
		onSelectedChange: ({ next }) => {
			if (next?.value) {
				value = next.value;
				onchange(next.value);
			}
			return next;
		}
	});

	const filteredDirs = $derived(
		directories.filter((d) =>
			d.path.toLowerCase().includes(($inputValue || '').toLowerCase()) ||
			d.shortname.toLowerCase().includes(($inputValue || '').toLowerCase())
		)
	);
</script>

<div class="relative">
	<div class="flex items-center gap-2">
		<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
		</svg>
		<input
			use:melt={$input}
			class="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none"
			placeholder="Select working directory..."
			value={value}
			oninput={(e) => {
				value = e.currentTarget.value;
			}}
		/>
	</div>

	{#if $open && filteredDirs.length > 0}
		<ul
			use:melt={$menu}
			class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
		>
			{#each filteredDirs as dir (dir.path)}
				<li
					use:melt={$option({ value: dir.path, label: dir.shortname })}
					class="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
				>
					<div class="font-medium text-gray-900 dark:text-gray-100">{dir.shortname}</div>
					<div class="text-xs text-gray-500 dark:text-gray-400 truncate">{dir.path}</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
