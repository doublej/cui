<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>CUI - Agent SDK Svelte</title>
</svelte:head>

<div class="min-h-screen bg-background">
	{@render children()}
</div>
