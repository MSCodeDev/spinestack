<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import caveatLatin from '#lib/assets/fonts/caveat-latin-wght-normal.woff2?url';
	import nunitoLatin from '#lib/assets/fonts/nunito-latin-wght-normal.woff2?url';
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

<svelte:head>
	<title>SpineStack</title>
	<link rel="icon" href={favicon} />
	<!-- Fetched with the page instead of when the CSS first needs them, so the fonts are ready on first paint. -->
	<link rel="preload" as="font" type="font/woff2" href={nunitoLatin} crossorigin="anonymous" />
	<link rel="preload" as="font" type="font/woff2" href={caveatLatin} crossorigin="anonymous" />
</svelte:head>
<BackgroundBlobs />
{@render children()}
<Toaster position="bottom-right" />
<ConfirmHost />
