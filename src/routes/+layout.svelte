<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import BackgroundBlobs from '#lib/components/BackgroundBlobs.svelte';
	import ConfirmHost from '#lib/components/ConfirmHost.svelte';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import { THEMES, type Theme } from '#lib/preferences.js';
	import { themeState } from '#lib/stores/theme.svelte.js';

	let { children } = $props();

	// The server renders the theme on <html>; mirror it for components that need to know.
	onMount(() => {
		const theme = document.documentElement.dataset.theme as Theme;
		if (THEMES.includes(theme)) themeState.theme = theme;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<BackgroundBlobs />
{@render children()}
<Toaster position="bottom-right" />
<ConfirmHost />
