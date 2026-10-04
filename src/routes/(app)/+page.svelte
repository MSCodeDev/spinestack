<script lang="ts">
	import { goto, refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import AddBookModal from '#lib/components/AddBookModal.svelte';
	import BookModal from '#lib/components/BookModal.svelte';
	import CoverCard from '#lib/components/CoverCard.svelte';
	import LibraryToolbar from '#lib/components/LibraryToolbar.svelte';
	import StatsStrip from '#lib/components/StatsStrip.svelte';
	import { PAGE_SIZE, serializeQuery } from '#lib/library/query.js';
	import { withParams } from '#lib/modal-url.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import type { BookListItem, BookPage, Options } from '#lib/types.js';

	let { data } = $props();

	const bookId = $derived(page.url.searchParams.get('book'));
	const editing = $derived(page.url.searchParams.has('edit'));
	const adding = $derived(page.url.searchParams.has('add'));

	let options = $state<Options>({
		authors: [],
		publishers: [],
		series: [],
		locations: [],
		tags: []
	});

	async function loadOptions() {
		options = await (await fetch('/api/options')).json();
	}

	$effect(() => {
		if (bookId || adding) loadOptions();
	});

	const go = (changes: Record<string, string | null>) =>
		goto(resolve('/(app)') + withParams(page.url, changes), { replace: true, reset: false });

	const closeAll = () => go({ book: null, edit: null, add: null });

	async function saved(id: string) {
		await refreshAll();
		toast('Book saved');
		await go({ add: null, edit: null, book: id });
	}

	// Pages beyond the first are fetched client-side and dropped whenever the load reruns.
	let more = $state<BookListItem[]>([]);
	let loadingMore = $state(false);
	$effect(() => {
		void data.page;
		more = [];
	});

	const items = $derived([...data.page.items, ...more]);
	const remaining = $derived(data.page.total - items.length);

	async function loadMore() {
		loadingMore = true;
		try {
			const params = serializeQuery(data.query);
			params.set('offset', String(items.length));
			const next: BookPage = await (await fetch(`/api/books?${params}`)).json();
			more = [...more, ...next.items];
		} finally {
			loadingMore = false;
		}
	}
</script>

<div class="space-y-5">
	<StatsStrip stats={data.stats} />
	<LibraryToolbar q={data.query.q} onsearch={(q) => go({ q: q || null })} />

	{#if items.length}
		<ul
			class="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
		>
			{#each items as book (book.id)}
				<li><CoverCard {book} /></li>
			{/each}
		</ul>
		{#if remaining > 0}
			<div class="text-center">
				<button class="btn" onclick={loadMore} disabled={loadingMore}>
					{loadingMore
						? 'Loading…'
						: `Load more (${Math.min(remaining, PAGE_SIZE)} of ${remaining})`}
				</button>
			</div>
		{/if}
	{:else if data.query.q}
		<p class="py-12 text-center text-stone-500">No books match “{data.query.q}”.</p>
	{:else}
		<p class="py-12 text-center text-stone-500">
			No books yet. <a href="{resolve('/(app)')}?add" class="underline">Add your first book</a>.
		</p>
	{/if}
</div>

<AddBookModal open={adding} {options} onclose={closeAll} onsaved={saved} />
<BookModal
	{bookId}
	edit={editing}
	{options}
	onclose={closeAll}
	onedit={(edit) => go({ edit: edit ? '' : null })}
	onsaved={saved}
/>
