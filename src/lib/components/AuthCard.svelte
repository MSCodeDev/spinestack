<script lang="ts">
	import type { Snippet } from 'svelte';
	import Wordmark from './Wordmark.svelte';

	let { title, subtitle, children }: { title: string; subtitle?: string; children: Snippet } =
		$props();
</script>

<main class="flex min-h-dvh flex-col items-center justify-center gap-8 p-4">
	<Wordmark large />
	<div class="w-full max-w-sm soft-a border border-border bg-card p-9 shadow-lg">
		<h1 class="font-display text-4xl leading-none font-bold">{title}</h1>
		{#if subtitle}<p class="mt-2 text-sm text-muted-foreground">{subtitle}</p>{/if}
		<div class="mt-6">{@render children()}</div>
	</div>
</main>
