<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { refreshAll } from '$app/navigation';
	import { api } from '#lib/client/api.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { confirm } from '#lib/stores/confirm.svelte.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import type { RematchProgress } from '#lib/types.js';

	let progress = $state<RematchProgress | null>(null);
	let overwrite = $state(false);
	let replaceCovers = $state(false);
	let starting = $state(false);
	let wasRunning = false;

	const running = $derived(progress?.state === 'running');
	const finished = $derived(
		progress?.state === 'done' || progress?.state === 'cancelled' || progress?.state === 'failed'
	);
	const percent = $derived(
		progress?.total ? Math.round((progress.done / progress.total) * 100) : 0
	);

	async function load() {
		try {
			progress = (await api<{ progress: RematchProgress }>('/api/settings/rematch')).progress;
		} catch {
			// keep showing the last known state
		}
	}

	// Pick up a run that is already going, or the result of the last one.
	onMount(load);

	$effect(() => {
		if (!running) return;
		const timer = setInterval(load, 1000);
		return () => clearInterval(timer);
	});

	// When a run ends, refresh the list behind the dialog so new covers and details show.
	$effect(() => {
		const state = progress?.state;
		untrack(() => {
			if (wasRunning && state && state !== 'running') {
				if (state === 'done') toast('Book details refreshed');
				refreshAll();
			}
			wasRunning = state === 'running';
		});
	});

	async function start() {
		const message =
			overwrite || replaceCovers
				? 'Look every book up again and replace the details you chose to overwrite?'
				: 'Look every book up again and fill in what is missing?';
		if (!(await confirm(message, 'Start'))) return;

		starting = true;
		try {
			progress = (
				await api<{ progress: RematchProgress }>('/api/settings/rematch', 'POST', {
					overwrite,
					replaceCovers
				})
			).progress;
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Could not start', 'error');
		} finally {
			starting = false;
		}
	}

	async function stop() {
		try {
			progress = (await api<{ progress: RematchProgress }>('/api/settings/rematch', 'DELETE'))
				.progress;
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Could not stop', 'error');
		}
	}

	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<section class="space-y-3">
	<h3 class="font-display text-2xl leading-none font-bold">Refresh book details</h3>
	<p class="text-muted-foreground">
		Looks every book up again on Open Library, Google Books, Hardcover and Apple Books, and fills in
		what is missing: publisher, pages, synopsis and covers. Your notes, prices, locations and tags
		are never changed. Export a backup below first if you want a way back.
	</p>

	{#if running && progress}
		<div class="space-y-2">
			<div
				class="h-3 overflow-hidden rounded-full bg-muted"
				role="progressbar"
				aria-label="Refreshing book details"
				aria-valuemin={0}
				aria-valuemax={progress.total}
				aria-valuenow={progress.done}
			>
				<div
					class="h-full rounded-full bg-primary transition-[width] duration-500"
					style:width="{percent}%"
				></div>
			</div>
			<div class="flex items-center justify-between gap-3 text-xs text-muted-foreground">
				<span class="min-w-0 truncate"
					>{progress.total ? `${progress.done} of ${progress.total}` : 'Starting'}{progress.current
						? ` · ${progress.current}`
						: ''}</span
				>
				<span class="shrink-0 font-bold">{percent}%</span>
			</div>
			<button type="button" class="btn" onclick={stop}>Stop</button>
		</div>
	{:else}
		<div class="space-y-2">
			<label class="flex items-start gap-2.5">
				<Checkbox bind:checked={overwrite} class="mt-0.5" />
				<span>Replace details that are already filled in</span>
			</label>
			<label class="flex items-start gap-2.5">
				<Checkbox bind:checked={replaceCovers} class="mt-0.5" />
				<span> Replace covers that are already set </span>
			</label>
		</div>
		<button type="button" class="btn btn-primary" disabled={starting} onclick={start}>
			Refresh book details
		</button>
	{/if}

	{#if finished && progress}
		<div class="space-y-2 rounded-2xl bg-muted/60 p-4" role="status">
			{#if progress.state === 'failed'}
				<p class="font-medium text-destructive">{progress.error ?? 'The refresh failed.'}</p>
			{:else if progress.state === 'cancelled'}
				<p class="font-medium">Stopped after {progress.done} of {progress.total}.</p>
			{:else}
				<p class="font-medium">Checked {plural(progress.total, 'book')}.</p>
			{/if}
			<ul class="text-muted-foreground">
				<li>{progress.matched} matched, {progress.updated} updated</li>
				<li>{plural(progress.covers, 'cover')} added or replaced</li>
				{#if progress.failed}<li>{progress.failed} could not be checked</li>{/if}
			</ul>
			{#if progress.unmatchedCount}
				<details>
					<summary class="cursor-pointer font-medium"
						>{plural(progress.unmatchedCount, 'book')} not found</summary
					>
					<ul class="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
						{#each progress.unmatched as u (u.id)}<li>{u.title}</li>{/each}
						{#if progress.unmatchedCount > progress.unmatched.length}
							<li class="list-none">
								…and {progress.unmatchedCount - progress.unmatched.length} more
							</li>
						{/if}
					</ul>
				</details>
			{/if}
		</div>
	{/if}
</section>
