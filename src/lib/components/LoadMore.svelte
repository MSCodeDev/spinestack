<script lang="ts">
	import { LoaderCircle } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.js';

	type Props = {
		/** Books on screen and books that match, so the rest can be counted. */
		shown: number;
		total: number;
		/** Books fetched per batch; the end-of-list note only appears when there was more than one. */
		batch: number;
		loading: boolean;
		error: string | null;
		onload: () => void;
	};

	let { shown, total, batch, loading, error, onload }: Props = $props();

	let sentinel = $state<HTMLElement>();
	const remaining = $derived(total - shown);

	// Loads the next batch as the end of the list nears the screen. The effect re-runs after every
	// batch, so a short list that still leaves the sentinel in view keeps loading until it is full.
	$effect(() => {
		if (!sentinel || remaining <= 0 || loading || error) return;
		const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && onload(), {
			rootMargin: '900px 0px'
		});
		observer.observe(sentinel);
		return () => observer.disconnect();
	});
</script>

{#if remaining > 0}
	<div
		bind:this={sentinel}
		class="flex min-h-20 flex-col items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
		aria-live="polite"
	>
		{#if error}
			<span class="text-destructive" role="alert">{error}</span>
			<Button variant="outline" size="sm" onclick={onload}>Try again</Button>
		{:else if loading}
			<span class="flex items-center gap-2"
				><LoaderCircle class="size-4 animate-spin" /> Loading more books…</span
			>
		{:else}
			<Button variant="ghost" size="sm" onclick={onload}
				>Show {Math.min(remaining, batch)} more</Button
			>
		{/if}
	</div>
{:else if total > batch}
	<p class="py-6 text-center text-sm text-muted-foreground">That's all {total} books.</p>
{/if}
