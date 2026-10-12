<script lang="ts">
	import { untrack } from 'svelte';
	import { goto, refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import AddBookModal from '#lib/components/AddBookModal.svelte';
	import BookModal from '#lib/components/BookModal.svelte';
	import ActiveFilters from '#lib/components/ActiveFilters.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import CoversView from '#lib/components/CoversView.svelte';
	import FiltersPanel from '#lib/components/FiltersPanel.svelte';
	import SettingsModal from '#lib/components/SettingsModal.svelte';
	import LibraryToolbar from '#lib/components/LibraryToolbar.svelte';
	import LoadMore from '#lib/components/LoadMore.svelte';
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
	import { withParams, withQuery } from '#lib/modal-url.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import type { BookListItem, BookPage, Options } from '#lib/types.js';

	let { data } = $props();

	const bookId = $derived(page.url.searchParams.get('book'));
	const editing = $derived(page.url.searchParams.has('edit'));
	const adding = $derived(page.url.searchParams.has('add'));
	const settingsTab = $derived(page.url.searchParams.get('settings'));

	let options = $state<Options>({
		hasSubtitles: false,
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

	// Batches beyond the first are fetched as you scroll. A different list (new search, filter,
	// sort…) starts over; a refresh of the same list (a save, a new cover) refetches what is loaded
	// and swaps it in, so the list keeps its length and your place in it.
	// A grouped list is loaded whole by the server, so there is never anything more to fetch.
	let more = $state<BookListItem[]>([]);
	let loadingMore = $state(false);
	let loadError = $state<string | null>(null);
	let listKey = '';

	$effect(() => {
		const loadedFor = data.page;
		const key = `${data.pageSize}|${JSON.stringify(data.query)}`;
		untrack(() => {
			if (key !== listKey) {
				listKey = key;
				more = [];
				loadError = null;
			} else {
				void reloadMore(loadedFor);
			}
		});
	});

	async function reloadMore(loadedFor: BookPage) {
		const count = more.length;
		if (!count) return;
		loadingMore = true;
		try {
			const params = serializeQuery(data.query, defaults);
			params.set('offset', String(loadedFor.items.length));
			params.set('limit', String(count));
			const res = await fetch(`/api/books?${params}`);
			if (!res.ok) return;
			const next: BookPage = await res.json();
			if (loadedFor === data.page) more = next.items;
		} catch {
			// keep showing what was loaded
		} finally {
			loadingMore = false;
		}
	}

	// Until a refresh lands, the old batches may overlap the new first one.
	const items = $derived.by(() => {
		const first = new Set(data.page.items.map((b) => b.id));
		return [...data.page.items, ...more.filter((b) => !first.has(b.id))];
	});
	const segments = $derived(toSegments(items, data.page.groups));

	async function loadMore() {
		if (loadingMore || items.length >= data.page.total) return;
		const loadedFor = data.page;
		loadingMore = true;
		loadError = null;
		try {
			const params = serializeQuery(data.query, defaults);
			params.set('offset', String(items.length));
			const res = await fetch(`/api/books?${params}`);
			if (!res.ok) throw new Error('Could not load more books.');
			const next: BookPage = await res.json();
			// the list may have changed (new search, filter…) while this was in flight
			if (loadedFor === data.page) more = [...more, ...next.items];
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Could not load more books.';
		} finally {
			loadingMore = false;
		}
	}
</script>

<div class="space-y-6">
	<StatsStrip stats={data.stats} />
	<LibraryToolbar
		query={data.query}
		filterCount={activeFilterCount(data.query)}
		{filtersOpen}
		onsearch={(q) => update({ q })}
		onchange={update}
		onfilters={() => (filtersOpen = !filtersOpen)}
	/>
	<FiltersPanel
		open={filtersOpen}
		query={data.query}
		{options}
		priceBounds={data.stats.priceRange}
		dateBounds={data.stats.dateRange}
		currency={data.prefs.currency}
		onchange={update}
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
		<LoadMore
			shown={items.length}
			total={data.page.total}
			batch={data.pageSize}
			loading={loadingMore}
			error={loadError}
			onload={loadMore}
		/>
	{:else}
		<EmptyState filtered={!!(activeFilterCount(data.query) || data.query.q)} />
	{/if}
</div>

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
