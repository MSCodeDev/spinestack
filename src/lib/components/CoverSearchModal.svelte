<script lang="ts">
	import { untrack } from 'svelte';
	import { deserialize } from '$app/forms';
	import { refreshAll } from '$app/navigation';
	import { Search } from '@lucide/svelte';
	import Modal from './Modal.svelte';
	import { actionHref } from '#lib/modal-url.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import type { CoverCandidate } from '#lib/types.js';

	type Props = {
		open: boolean;
		bookId: string;
		/** Prefilled search, usually the title and first author. */
		query: string;
		isbn: string | null;
		onclose: () => void;
		onpicked: () => void | Promise<void>;
	};

	let { open, bookId, query, isbn, onclose, onpicked }: Props = $props();

	let term = $state('');
	let candidates = $state<CoverCandidate[] | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let picking = $state<string | null>(null);
	// Covers that failed to load (e.g. no image for an ISBN) are hidden.
	let broken = $state<string[]>([]);

	const visible = $derived((candidates ?? []).filter((c) => !broken.includes(c.url)));

	// Runs when the modal opens; typing in the box must not restart it.
	$effect(() => {
		if (!open) return;
		untrack(() => {
			term = query;
			candidates = null;
			error = null;
			broken = [];
			search();
		});
	});

	async function search() {
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams({ q: term, ...(isbn ? { isbn } : {}) });
			const res = await fetch(`/api/covers/search?${params}`);
			if (!res.ok)
				throw new Error((await res.json().catch(() => null))?.message ?? 'Search failed.');
			candidates = (await res.json()).candidates;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Search failed.';
		} finally {
			loading = false;
		}
	}

	async function pick(candidate: CoverCandidate) {
		picking = candidate.url;
		try {
			const body = new FormData();
			body.set('id', bookId);
			body.set('url', candidate.url);
			const res = await fetch(actionHref('setCoverFromUrl'), {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await res.text());
			if (result.type !== 'success') {
				toast(
					result.type === 'failure'
						? ((result.data?.error as string) ?? 'Could not use that cover.')
						: 'Could not use that cover.',
					'error'
				);
				return;
			}
			toast('Cover updated');
			// This post bypasses the form enhancer, so refresh the list's data (and its cover URLs) here.
			await refreshAll();
			await onpicked();
		} finally {
			picking = null;
		}
	}
</script>

<Modal {open} title="Find a cover" size="lg" {onclose}>
	<form
		class="mb-4 flex gap-2"
		onsubmit={(e) => {
			e.preventDefault();
			search();
		}}
	>
		<label class="relative flex-1">
			<span class="sr-only">Search for a cover</span>
			<Search size={16} class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
			<input class="input mt-0 pl-9" bind:value={term} placeholder="Title and author" />
		</label>
		<button class="btn btn-primary" disabled={loading}>Search</button>
	</form>

	{#if loading}
		<p class="text-sm text-muted-foreground">Searching…</p>
	{:else if error}
		<p class="text-sm text-destructive" role="alert">{error}</p>
	{:else if candidates && !visible.length}
		<p class="text-sm text-muted-foreground">
			No covers found. Try a different search, or upload your own.
		</p>
	{:else}
		<ul class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
			{#each visible as c (c.url)}
				<li>
					<button
						type="button"
						class="group relative block aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-l-md rounded-r-lg bg-muted ring-1 ring-black/10 hover:ring-2 hover:ring-primary"
						disabled={picking !== null}
						aria-label="Use cover: {c.label}"
						onclick={() => pick(c)}
					>
						<img
							src={c.url}
							alt=""
							loading="lazy"
							referrerpolicy="no-referrer"
							class="h-full w-full object-cover"
							onerror={() => (broken = [...broken, c.url])}
						/>
						<span
							class="absolute inset-x-0 bottom-0 line-clamp-2 bg-foreground/80 p-1.5 text-left text-xs text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
						>
							{c.label}
						</span>
						{#if picking === c.url}
							<span
								class="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white"
								>Saving…</span
							>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
