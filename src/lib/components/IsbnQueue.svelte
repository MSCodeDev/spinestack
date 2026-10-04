<script lang="ts">
	import { Camera, X } from '@lucide/svelte';
	import BarcodeScanner from './BarcodeScanner.svelte';
	import LookupResults from './LookupResults.svelte';
	import { saveDraft } from '#lib/client/save-book.js';
	import { toIsbn13 } from '#lib/isbn.js';
	import { resultToDraft } from '#lib/library/draft.js';
	import { enqueue, type QueueItem } from '#lib/scan/isbn-scan.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import type { Draft, LookupResult } from '#lib/types.js';

	type Props = {
		onreview: (draft: Draft) => void;
		/** A book was added from the queue; the modal stays open for the next one. */
		onadded: () => void | Promise<void>;
		onclose: () => void;
	};

	let { onreview, onadded, onclose }: Props = $props();

	// Public book APIs are rate limited, so lookups run one at a time with a pause.
	const LOOKUP_GAP_MS = 800;

	let input = $state('');
	let inputError = $state<string | null>(null);
	let scanning = $state(false);
	let queue = $state<QueueItem[]>([]);
	let results = $state<Record<string, LookupResult>>({});
	let added = $state<Record<string, string>>({});
	let errors = $state<Record<string, string>>({});
	let adding = $state(false);
	let pumping = false;

	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

	async function pump() {
		if (pumping) return;
		pumping = true;
		try {
			let item: QueueItem | undefined;
			while ((item = queue.find((q) => q.status === 'looking'))) {
				const current = item;
				try {
					const res = await fetch(`/api/lookup?isbn=${current.isbn}`);
					if (!res.ok)
						throw new Error((await res.json().catch(() => null))?.message ?? 'Lookup failed.');
					const [found] = (await res.json()).results as LookupResult[];
					if (found) {
						results[current.isbn] = { ...found, isbn: found.isbn ?? current.isbn };
						current.status = 'found';
					} else {
						current.status = 'missing';
					}
				} catch (e) {
					errors[current.isbn] = e instanceof Error ? e.message : 'Lookup failed.';
					current.status = 'error';
				}
				if (queue.some((q) => q.status === 'looking')) await sleep(LOOKUP_GAP_MS);
			}
		} finally {
			pumping = false;
		}
	}

	function submit(raw: string) {
		const isbn = toIsbn13(raw);
		if (!isbn) {
			inputError = 'That is not a valid ISBN.';
			return;
		}
		inputError = null;
		queue = enqueue(queue, isbn);
		pump();
	}

	const retry = (isbn: string) => {
		queue = queue.map((q) => (q.isbn === isbn ? { ...q, status: 'looking' } : q));
		pump();
	};

	const remove = (isbn: string) => (queue = queue.filter((q) => q.isbn !== isbn));

	const found = $derived(queue.filter((q) => q.status === 'found').map((q) => results[q.isbn]));
	const addable = $derived(found.filter((r) => r.isbn && !r.existingId && !added[r.isbn]));
	const others = $derived(queue.filter((q) => q.status !== 'found'));

	// A few at a time: each add may wait on a cover download.
	const ADD_CONCURRENCY = 3;

	async function addAll() {
		adding = true;
		let count = 0;
		const todo = [...addable];

		async function worker() {
			for (let r = todo.shift(); r; r = todo.shift()) {
				try {
					const { id } = await saveDraft(resultToDraft(r));
					added[r.isbn!] = id;
					count++;
				} catch (e) {
					toast(`${r.title}: ${e instanceof Error ? e.message : 'could not be added'}`, 'error');
				}
			}
		}
		await Promise.all(Array.from({ length: ADD_CONCURRENCY }, worker));

		adding = false;
		if (count) {
			toast(`Added ${count} ${count === 1 ? 'book' : 'books'}`);
			await onadded();
		}
	}
</script>

<form
	class="flex items-end gap-2"
	onsubmit={(e) => {
		e.preventDefault();
		submit(input);
		if (!inputError) input = '';
	}}
>
	<label class="block flex-1 text-sm font-medium">
		ISBN
		<input class="input" bind:value={input} inputmode="numeric" placeholder="978…" />
	</label>
	<button class="btn btn-primary">Find</button>
	<button
		type="button"
		class="btn border border-stone-300 dark:border-stone-700"
		aria-pressed={scanning}
		onclick={() => (scanning = !scanning)}
	>
		<Camera size={16} />
		{scanning ? 'Stop' : 'Scan'}
	</button>
</form>
{#if inputError}<p class="mt-1 text-sm text-red-600" role="alert">{inputError}</p>{/if}

{#if scanning}
	<div class="mt-3 space-y-1">
		<BarcodeScanner onscan={submit} />
		<p class="text-xs text-stone-500">
			Point the camera at a book's barcode. Scanned books are listed below.
		</p>
	</div>
{/if}

{#if others.length}
	<ul class="mt-4 space-y-1 text-sm">
		{#each others as item (item.isbn)}
			<li
				class="flex items-center justify-between gap-2 rounded bg-stone-50 px-3 py-2 dark:bg-stone-800/60"
			>
				<span>
					<span class="font-mono">{item.isbn}</span>
					{#if item.status === 'looking'}
						<span class="text-stone-500"> · looking up…</span>
					{:else if item.status === 'missing'}
						<span class="text-stone-500"> · no match found</span>
					{:else}
						<span class="text-red-600"> · {errors[item.isbn]}</span>
					{/if}
				</span>
				<span class="flex items-center gap-1">
					{#if item.status === 'missing'}
						<button type="button" class="btn text-xs" onclick={() => onreview({ isbn: item.isbn })}
							>Add manually</button
						>
					{:else if item.status === 'error'}
						<button type="button" class="btn text-xs" onclick={() => retry(item.isbn)}>Retry</button
						>
					{/if}
					<button
						type="button"
						class="rounded p-1 hover:bg-stone-200 dark:hover:bg-stone-700"
						aria-label="Remove {item.isbn}"
						onclick={() => remove(item.isbn)}
					>
						<X size={14} />
					</button>
				</span>
			</li>
		{/each}
	</ul>
{/if}

{#if found.length}
	<div class="mt-4">
		<LookupResults
			results={found}
			{onreview}
			{added}
			onsaved={async (id, r) => {
				added[r.isbn!] = id;
				await onadded();
			}}
		/>
	</div>
	<div class="mt-3 flex items-center justify-between">
		{#if addable.length > 1}
			<button type="button" class="btn btn-primary" disabled={adding} onclick={addAll}>
				{adding ? 'Adding…' : `Add all (${addable.length})`}
			</button>
		{:else}
			<span></span>
		{/if}
		{#if Object.keys(added).length}
			<button type="button" class="btn" onclick={onclose}>Done</button>
		{/if}
	</div>
{/if}
