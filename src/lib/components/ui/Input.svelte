<script lang="ts">
	interface Props {
		value?: string;
		placeholder?: string;
		type?: 'text' | 'password' | 'email' | 'search' | 'url';
		disabled?: boolean;
		readonly?: boolean;
		class?: string;
		oninput?: (e: Event) => void;
		onkeydown?: (e: KeyboardEvent) => void;
	}

	let {
		value = $bindable(''),
		placeholder = '',
		type = 'text',
		disabled = false,
		readonly = false,
		class: className = '',
		oninput,
		onkeydown
	}: Props = $props();

	const baseStyles = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400';
</script>

<input
	{type}
	bind:value
	{placeholder}
	{disabled}
	{readonly}
	class="{baseStyles} {className}"
	{oninput}
	{onkeydown}
/>
