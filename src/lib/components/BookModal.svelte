<script lang="ts">
	import { actionHref } from '#lib/modal-url.js';
	import { enhance } from '$app/forms';
	import { Pencil, Trash2 } from '@lucide/svelte';
	import Modal from './Modal.svelte';
	import BookForm from './BookForm.svelte';
	import CoverPanel from './CoverPanel.svelte';
	import { confirm } from '#lib/stores/confirm.svelte.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import { formatMoney } from '#lib/money.js';
	import type { BookDetail, Options } from '#lib/types.js';

	type Props = {
		bookId: string | null;
		edit: boolean;
		options: Options;
		defaultCurrency: string;
		onclose: () => void;
		onedit: (edit: boolean) => void;
		onsaved: (bookId: string) => void | Promise<void>;
	};

	let { bookId, edit, options, defaultCurrency, onclose, onedit, onsaved }: Props = $props();

	let open = $derived(bookId !== null);
	let book = $state<BookDetail | null>(null);
	let missing = $state(false);
	let deleteForm = $state<HTMLFormElement>();

	async function load(id: string) {
		const res = await fetch(`/api/books/${id}`);
		missing = !res.ok;
		book = res.ok ? await res.json() : null;
	}

	// Only reset when switching books; a refetch of the same book keeps showing the old data.
	let loadedFor: string | null = null;
	$effect(() => {
		const id = bookId;
		if (id === loadedFor) return;
		loadedFor = id;
		book = null;
		missing = false;
		if (id) load(id);
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
		<p class="text-muted-foreground">Loading…</p>
	{:else if edit}
		{#key book.id}
			<BookForm
				id="book-form"
				{book}
				{options}
				{defaultCurrency}
				onsaved={async (id) => {
					await load(id);
					await onsaved(id);
				}}
				oncancel={() => onedit(false)}
			/>
		{/key}
	{:else}
		<div class="flex flex-col gap-5 sm:flex-row">
			<CoverPanel
				bookId={book.id}
				title={book.title}
				author={book.authors[0] ?? null}
				isbn={book.isbn}
				coverVersion={book.coverVersion}
				onchanged={async () => {
					if (bookId) await load(bookId);
				}}
			/>
			<div class="min-w-0 flex-1 space-y-4">
				<div>
					{#if book.subtitle}<p class="text-muted-foreground">{book.subtitle}</p>{/if}
					{#if book.authors.length}<p class="font-medium">{book.authors.join(', ')}</p>{/if}
					<p class="mt-1 text-xs tracking-wide text-muted-foreground uppercase">{book.status}</p>
				</div>

				<dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
					{#each rows as [label, value] (label)}
						<dt class="text-muted-foreground">{label}</dt>
						<dd>{value}</dd>
					{/each}
				</dl>

				{#if book.tags.length}
					<div class="flex flex-wrap gap-1.5">
						{#each book.tags as t (t)}
							<span class="rounded bg-muted px-2 py-0.5 text-sm">{t}</span>
						{/each}
					</div>
				{/if}

				{#if book.synopsis}<p class="text-sm whitespace-pre-line">{book.synopsis}</p>{/if}
				{#if book.notes}
					<p class="rounded bg-accent p-3 text-sm whitespace-pre-line">
						{book.notes}
					</p>
				{/if}

				<section>
					<div class="flex items-center justify-between">
						<h3 class="font-display text-2xl leading-none font-bold">Reading</h3>
						<form
							method="post"
							action={actionHref('startReading')}
							use:enhance={() =>
								async ({ update }) => {
									await update({ reset: false });
									if (bookId) await load(bookId);
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
										action={actionHref('finishReading')}
										use:enhance={() =>
											async ({ update }) => {
												await update({ reset: false });
												if (bookId) await load(bookId);
											}}
									>
										<input type="hidden" name="readingId" value={r.id} />
										<button class="btn">Finish</button>
									</form>
								{/if}
							</li>
						{:else}
							<li class="text-muted-foreground">Not read yet.</li>
						{/each}
					</ul>
				</section>

				<div class="squiggle"></div>
				<div class="flex justify-between">
					<form
						bind:this={deleteForm}
						method="post"
						action={actionHref('delete')}
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
						<button type="button" class="btn text-destructive" onclick={remove}>
							<Trash2 size={16} /> Delete
						</button>
					</form>
					<button type="button" class="btn btn-primary" onclick={() => onedit(true)}>
						<Pencil size={16} /> Edit
					</button>
				</div>
			</div>
		</div>
	{/if}
</Modal>
