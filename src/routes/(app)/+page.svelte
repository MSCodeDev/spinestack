<script lang="ts">
	import { goto, refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import AddBookModal from '#lib/components/AddBookModal.svelte';
	import BookModal from '#lib/components/BookModal.svelte';
	import ActiveFilters from '#lib/components/ActiveFilters.svelte';
	import CoversView from '#lib/components/CoversView.svelte';
	import FiltersPanel from '#lib/components/FiltersPanel.svelte';
	import SettingsModal from '#lib/components/SettingsModal.svelte';
	import LibraryToolbar from '#lib/components/LibraryToolbar.svelte';
	import StackedView from '#lib/components/StackedView.svelte';
	import StatsStrip from '#lib/components/StatsStrip.svelte';
	import TableView from '#lib/components/TableView.svelte';
	import { toSegments } from '#lib/library/groups.js';
	import {
		DEFAULT_QUERY,
		activeFilterCount,
		defaultDir,
		serializeQuery,
		type LibraryQuery,
		type SortField
	} from '#lib/library/query.js';
	import { modalHref, withParams, withQuery } from '#lib/modal-url.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import type { BookListItem, BookPage, Options } from '#lib/types.js';

	let { data } = $props();

	const bookId = $derived(page.url.searchParams.get('book'));
	const editing = $derived(page.url.searchParams.has('edit'));
	const adding = $derived(page.url.searchParams.has('add'));
	const settingsTab = $derived(page.url.searchParams.get('settings'));

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

	let filtersOpen = $state(false);

	$effect(() => {
		if (bookId || adding || filtersOpen) loadOptions();
	});

	const go = (changes: Record<string, string | null>) =>
		goto(resolve('/(app)') + withParams(page.url, changes), { replace: true, reset: false });

	const closeAll = () => go({ book: null, edit: null, add: null, settings: null });

	const defaults = $derived({ view: data.prefs.defaultView });

	const update = (patch: Partial<LibraryQuery>) =>
		goto(resolve('/(app)') + withQuery(page.url, { ...data.query, ...patch }, defaults), {
			replace: true,
			reset: false
		});

	const clearFilters = () =>
		update({
			...DEFAULT_QUERY,
			sort: data.query.sort,
			dir: data.query.dir,
			group: data.query.group,
			view: data.query.view
		});

	const resetAll = () => update({ ...DEFAULT_QUERY, view: data.query.view });

	function sortBy(field: SortField) {
		const same = data.query.sort === field;
		update({
			sort: field,
			dir: same ? (data.query.dir === 'asc' ? 'desc' : 'asc') : defaultDir(field)
		});
	}

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
	const segments = $derived(toSegments(items, data.page.groups));
	const remaining = $derived(data.page.total - items.length);

	async function loadMore() {
		loadingMore = true;
		try {
			const params = serializeQuery(data.query, defaults);
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
	<LibraryToolbar
		q={data.query.q}
		view={data.query.view}
		filterCount={activeFilterCount(data.query)}
		onsearch={(q) => update({ q })}
		onview={(view) => update({ view })}
		onfilters={() => (filtersOpen = true)}
	/>
	<ActiveFilters query={data.query} onchange={update} onclear={clearFilters} />

	{#if items.length}
		{#if data.query.view === 'table'}
			<TableView
				{segments}
				group={data.query.group}
				sort={data.query.sort}
				dir={data.query.dir}
				onsort={sortBy}
			/>
		{:else if data.query.view === 'stacked'}
			<StackedView {segments} group={data.query.group} />
		{:else}
			<CoversView {segments} group={data.query.group} />
		{/if}
		{#if remaining > 0}
			<div class="text-center">
				<button class="btn" onclick={loadMore} disabled={loadingMore}>
					{loadingMore
						? 'Loading…'
						: `Load more (${Math.min(remaining, data.pageSize)} of ${remaining})`}
				</button>
			</div>
		{/if}
	{:else if activeFilterCount(data.query) || data.query.q}
		<p class="py-12 text-center text-stone-500">No books match your search or filters.</p>
	{:else}
		<p class="py-12 text-center text-stone-500">
			No books yet. <a href={modalHref({ add: '' })} class="underline">Add your first book</a>.
		</p>
	{/if}
</div>

<FiltersPanel
	bind:open={filtersOpen}
	query={data.query}
	{options}
	onchange={update}
	onclear={resetAll}
/>
<AddBookModal
	open={adding}
	{options}
	defaultCurrency={data.prefs.currency}
	onclose={closeAll}
	onsaved={saved}
	onadded={() => refreshAll()}
/>
<BookModal
	{bookId}
	edit={editing}
	{options}
	defaultCurrency={data.prefs.currency}
	onclose={closeAll}
	onedit={(edit) => go({ edit: edit ? '' : null })}
	onsaved={saved}
/>
<SettingsModal
	tab={settingsTab}
	prefs={data.prefs}
	user={data.user}
	ontab={(tab) => go({ settings: tab })}
	onclose={closeAll}
/>
