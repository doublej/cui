<script lang="ts">
	export type TabType = 'tasks' | 'history' | 'archive';

	interface Props {
		activeTab: TabType;
		onTabChange: (tab: TabType) => void;
	}

	let { activeTab, onTabChange }: Props = $props();

	const tabs: { id: TabType; label: string }[] = [
		{ id: 'tasks', label: 'Tasks' },
		{ id: 'history', label: 'History' },
		{ id: 'archive', label: 'Archive' }
	];
</script>

<div class="flex border-b border-gray-200 dark:border-gray-700 mt-6 mb-2">
	{#each tabs as tab (tab.id)}
		<button
			class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
			class:border-blue-500={activeTab === tab.id}
			class:text-blue-600={activeTab === tab.id}
			class:dark:text-blue-400={activeTab === tab.id}
			class:border-transparent={activeTab !== tab.id}
			class:text-gray-500={activeTab !== tab.id}
			class:hover:text-gray-700={activeTab !== tab.id}
			class:dark:text-gray-400={activeTab !== tab.id}
			class:dark:hover:text-gray-300={activeTab !== tab.id}
			onclick={() => onTabChange(tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</div>
