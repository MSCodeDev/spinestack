<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import Modal from './Modal.svelte';
	import BookForm from './BookForm.svelte';
	import LookupResults from './LookupResults.svelte';
	import type { Draft, LookupResult, Options } from '#lib/types.js';

	type Props = {
		open: boolean;
		options: Options;
		onclose: () => void;
		onsaved: (bookId: string) => void | Promise<void>;
	};

	let { open, options, onclose, onsaved }: Props = $props();

	type Tab = 'search' | 'isbn' | 'manual';
	const tabs: { id: Tab; label: string }[] = [
		{ id: 'search', label: 'Search' },
		{ id: 'isbn', label: 'ISBN' },
		{ id: 'manual', label: 'Manual' }
	];

	let tab = $state<Tab>('search');
	let draft = $state<Draft | null>(null);
	let title = $state('');
	let author = $state('');
	let isbn = $state('');
	let results = $state<LookupResult[] | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Start fresh each time the modal opens.
	$effect(() => {
		if (open) return;
		tab = 'search';
		draft = null;
		title = author = isbn = '';
		results = null;
		error = null;
	});

	function pick(next: Tab) {
		tab = next;
		results = null;
		error = null;
	}

	async function lookup(params: Record<string, string>) {
		loading = true;
		error = null;
		results = null;
		try {
			const res = await fetch(`/api/lookup?${new URLSearchParams(params)}`);
			if (!res.ok)
				throw new Error((await res.json().catch(() => null))?.message ?? 'Lookup failed.');
			results = (await res.json()).results;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Lookup failed.';
		} finally {
			loading = false;
		}
	}

	const searchByName = (e: SubmitEvent) => {
		e.preventDefault();
		return lookup({ title, author });
	};
	const searchByIsbn = (e: SubmitEvent) => {
		e.preventDefault();
		return lookup({ isbn });
	};
</script>

<Modal {open} title="Add book" size="md" {onclose}>
	{#if draft}
		<button type="button" class="btn mb-3" onclick={() => (draft = null)}>
			<ArrowLeft size={16} /> Back to results
		</button>
		{#key draft}
			<BookForm id="add-book-form" {draft} {options} {onsaved} oncancel={onclose} />
		{/key}
	{:else}
		<div class="mb-4 flex gap-1 border-b border-stone-200 dark:border-stone-800" role="tablist">
			{#each tabs as t (t.id)}
				<button
					type="button"
					role="tab"
					aria-selected={tab === t.id}
					class="-mb-px border-b-2 px-3 py-2 text-sm font-medium {tab === t.id
						? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
						: 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-white'}"
					onclick={() => pick(t.id)}
				>
					{t.label}
				</button>
			{/each}
		</div>

		{#if tab === 'search'}
			<form class="flex flex-wrap items-end gap-2" onsubmit={searchByName}>
				<label class="block min-w-40 flex-1 text-sm font-medium">
					Title
					<input class="input" bind:value={title} required minlength="2" />
				</label>
				<label class="block min-w-40 flex-1 text-sm font-medium">
					Author
					<input class="input" bind:value={author} placeholder="Optional" />
				</label>
				<button class="btn btn-primary" disabled={loading}>Search</button>
			</form>
		{:else if tab === 'isbn'}
			<form class="flex items-end gap-2" onsubmit={searchByIsbn}>
				<label class="block flex-1 text-sm font-medium">
					ISBN
					<input class="input" bind:value={isbn} required inputmode="numeric" placeholder="978…" />
				</label>
				<button class="btn btn-primary" disabled={loading}>Find</button>
			</form>
		{:else}
			<BookForm id="add-book-form" {options} {onsaved} oncancel={onclose} />
		{/if}

		{#if tab !== 'manual'}
			<div class="mt-4">
				{#if loading}
					<p class="text-sm text-stone-500">Searching…</p>
				{:else if error}
					<p class="text-sm text-red-600" role="alert">{error}</p>
				{:else if results && !results.length}
					<p class="text-sm text-stone-500">
						No matches.
						<button
							type="button"
							class="underline"
							onclick={() =>
								(draft = {
									title: tab === 'search' ? title : '',
									isbn: tab === 'isbn' ? isbn : null,
									authors: author ? [author] : []
								})}
						>
							Add it manually
						</button>
					</p>
				{:else if results}
					<LookupResults {results} onreview={(d) => (draft = d)} {onsaved} />
				{/if}
			</div>
		{/if}
	{/if}
</Modal>
