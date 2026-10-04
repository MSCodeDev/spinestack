<script lang="ts">
	import { modalHref } from '#lib/modal-url.js';
	import { saveDraft } from '#lib/client/save-book.js';
	import { resultToDraft } from '#lib/library/draft.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import type { Draft, LookupResult } from '#lib/types.js';

	type Props = {
		results: LookupResult[];
		onreview: (draft: Draft) => void;
		/** Called after a one-click add. Without `stay`, the caller usually opens the new book. */
		onsaved: (bookId: string, result: LookupResult) => void | Promise<void>;
		/** ISBN to book id for results already added during this session. */
		added?: Record<string, string>;
	};

	let { results, onreview, onsaved, added = {} }: Props = $props();

	let busy = $state<string | null>(null);
	let error = $state<string | null>(null);

	const keyOf = (r: LookupResult, i: number) => `${r.isbn ?? ''}|${r.title}|${i}`;

	const details = (r: LookupResult) =>
		[r.publisher, r.year, r.pageCount ? `${r.pageCount} pages` : null, r.language?.toUpperCase()]
			.filter(Boolean)
			.join(' · ');

	async function add(r: LookupResult, key: string) {
		busy = key;
		error = null;
		try {
			const { id, coverFailed } = await saveDraft(resultToDraft(r));
			if (coverFailed) toast('Added, but the cover could not be downloaded', 'error');
			await onsaved(id, r);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not add the book.';
		} finally {
			busy = null;
		}
	}
</script>

{#if error}<p class="mb-2 text-sm text-red-600" role="alert">{error}</p>{/if}

<ul class="divide-y divide-stone-200 dark:divide-stone-800">
	{#each results as r, i (keyOf(r, i))}
		{@const key = keyOf(r, i)}
		<li class="flex gap-3 py-3">
			<div class="h-20 w-14 shrink-0 overflow-hidden rounded bg-stone-200 dark:bg-stone-800">
				{#if r.coverUrl}
					<img
						src={r.coverUrl}
						alt=""
						loading="lazy"
						referrerpolicy="no-referrer"
						class="h-full w-full object-cover"
					/>
				{/if}
			</div>
			<div class="min-w-0 flex-1">
				<p class="font-medium">
					{r.title}{#if r.subtitle}<span class="font-normal text-stone-500">: {r.subtitle}</span
						>{/if}
				</p>
				{#if r.authors.length}<p class="text-sm">{r.authors.join(', ')}</p>{/if}
				<p class="text-xs text-stone-500">{details(r)}</p>
				{#if r.isbn}<p class="text-xs text-stone-500">ISBN {r.isbn}</p>{/if}
			</div>
			<div class="flex shrink-0 flex-col items-end gap-1.5">
				{#if r.isbn && added[r.isbn]}
					<span class="text-sm font-medium text-green-700 dark:text-green-400">Added ✓</span>
				{:else if r.existingId}
					<a href={modalHref({ add: null, book: r.existingId })} class="btn text-xs">In library</a>
				{:else}
					<button
						type="button"
						class="btn btn-primary text-xs"
						disabled={busy !== null}
						onclick={() => add(r, key)}
					>
						{busy === key ? 'Adding…' : 'Add'}
					</button>
					<button type="button" class="btn text-xs" onclick={() => onreview(resultToDraft(r))}
						>Edit first</button
					>
				{/if}
			</div>
		</li>
	{/each}
</ul>
