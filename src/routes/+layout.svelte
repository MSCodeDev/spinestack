<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ToastHost from '$lib/components/ToastHost.svelte';
	import ConfirmHost from '$lib/components/ConfirmHost.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
<ToastHost />
<ConfirmHost />
