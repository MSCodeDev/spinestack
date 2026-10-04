<script lang="ts">
	import { enhance } from '$app/forms';
	import { Pencil, Trash2 } from '@lucide/svelte';
	import Modal from './Modal.svelte';
	import BookForm from './BookForm.svelte';
	import { confirm } from '#lib/stores/confirm.svelte.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import { formatMoney } from '#lib/money.js';
	import type { BookDetail, Options } from '#lib/types.js';

	type Props = {
		bookId: string | null;
		edit: boolean;
		options: Options;
		onclose: () => void;
		onedit: (edit: boolean) => void;
		onsaved: (bookId: string) => void | Promise<void>;
	};

	let { bookId, edit, options, onclose, onedit, onsaved }: Props = $props();

	let open = $derived(bookId !== null);
	let book = $state<BookDetail | null>(null);
	let missing = $state(false);
	let deleteForm = $state<HTMLFormElement>();

	async function load(id: string) {
		const res = await fetch(`/api/books/${id}`);
		missing = !res.ok;
		book = res.ok ? await res.json() : null;
	}

	$effect(() => {
		book = null;
		missing = false;
		if (bookId) load(bookId);
	});

	async function remove() {
		if (await confirm(`Delete “${book?.title}”? This cannot be undone.`))
			deleteForm?.requestSubmit();
	}

	const rows = $derived(
		book
			? (
					[
						['ISBN', book.isbn],
						['Publisher', book.publisher],
						[
							'Series',
							book.series
								? `${book.series}${book.seriesNumber ? ` #${book.seriesNumber}` : ''}`
								: null
						],
						['Location', book.location],
						['Pages', book.pageCount],
						['Language', book.language],
						['Bought', book.boughtAt],
						['Arrived', book.arrivedAt],
						[
							'Label price',
							book.labelPrice !== null && book.currency
								? formatMoney(book.labelPrice, book.currency)
								: null
						],
						[
							'Paid',
							book.paidPrice !== null && book.currency
								? formatMoney(book.paidPrice, book.currency)
								: null
						]
					] as [string, string | number | null][]
				).filter(([, v]) => v !== null && v !== '')
			: []
	);
</script>

<Modal bind:open title={book?.title ?? 'Book'} size="md" {onclose}>
	{#if missing}
		<p>This book no longer exists.</p>
	{:else if !book}
		<p class="text-stone-500">Loading…</p>
	{:else if edit}
		{#key book.id}
			<BookForm id="book-form" {book} {options} {onsaved} oncancel={() => onedit(false)} />
		{/key}
	{:else}
		<div class="space-y-4">
			<div>
				{#if book.subtitle}<p class="text-stone-600 dark:text-stone-400">{book.subtitle}</p>{/if}
				{#if book.authors.length}<p class="font-medium">{book.authors.join(', ')}</p>{/if}
				<p class="mt-1 text-xs tracking-wide text-stone-500 uppercase">{book.status}</p>
			</div>

			<dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
				{#each rows as [label, value] (label)}
					<dt class="text-stone-500">{label}</dt>
					<dd>{value}</dd>
				{/each}
			</dl>

			{#if book.tags.length}
				<div class="flex flex-wrap gap-1.5">
					{#each book.tags as t (t)}
						<span class="rounded bg-stone-100 px-2 py-0.5 text-sm dark:bg-stone-800">{t}</span>
					{/each}
				</div>
			{/if}

			{#if book.synopsis}<p class="text-sm whitespace-pre-line">{book.synopsis}</p>{/if}
			{#if book.notes}
				<p class="rounded bg-amber-50 p-3 text-sm whitespace-pre-line dark:bg-amber-950/30">
					{book.notes}
				</p>
			{/if}

			<section>
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-semibold">Reading</h3>
					<form
						method="post"
						action="?/startReading"
						use:enhance={() =>
							async ({ update }) => {
								await update({ reset: false });
								await load(book!.id);
							}}
					>
						<input type="hidden" name="id" value={book.id} />
						<button class="btn">Start reading</button>
					</form>
				</div>
				<ul class="mt-1 space-y-1 text-sm">
					{#each book.readings as r (r.id)}
						<li class="flex items-center justify-between">
							<span>{r.startedAt} → {r.finishedAt ?? 'in progress'}</span>
							{#if !r.finishedAt}
								<form
									method="post"
									action="?/finishReading"
									use:enhance={() =>
										async ({ update }) => {
											await update({ reset: false });
											await load(book!.id);
										}}
								>
									<input type="hidden" name="readingId" value={r.id} />
									<button class="btn">Finish</button>
								</form>
							{/if}
						</li>
					{:else}
						<li class="text-stone-500">Not read yet.</li>
					{/each}
				</ul>
			</section>

			<div class="flex justify-between border-t border-stone-200 pt-3 dark:border-stone-700">
				<form
					bind:this={deleteForm}
					method="post"
					action="?/delete"
					use:enhance={() =>
						async ({ result, update }) => {
							if (result.type === 'success') {
								await update({ reset: false });
								toast('Book deleted');
								onclose();
							}
						}}
				>
					<input type="hidden" name="id" value={book.id} />
					<button type="button" class="btn text-red-600" onclick={remove}>
						<Trash2 size={16} /> Delete
					</button>
				</form>
				<button type="button" class="btn btn-primary" onclick={() => onedit(true)}>
					<Pencil size={16} /> Edit
				</button>
			</div>
		</div>
	{/if}
</Modal>
