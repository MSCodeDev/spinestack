<script lang="ts">
	import {
		ArrowDownAZ,
		ArrowUpAZ,
		Layers,
		LayoutGrid,
		Search,
		SlidersHorizontal,
		Table2
	} from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import {
		GROUPS,
		SORTS,
		defaultDir,
		type LibraryQuery,
		type SortField,
		type View
	} from '#lib/library/query.js';
	import { cn } from '#lib/utils.js';

	type Props = {
		query: LibraryQuery;
		filterCount: number;
		filtersOpen: boolean;
		onsearch: (q: string) => void;
		onchange: (patch: Partial<LibraryQuery>) => void;
		onfilters: () => void;
	};

	let { query, filterCount, filtersOpen, onsearch, onchange, onfilters }: Props = $props();

	// Follows the URL, but can be typed over until the next navigation.
	let value = $derived(query.q);
	let timer: ReturnType<typeof setTimeout>;

	function input() {
		clearTimeout(timer);
		timer = setTimeout(() => onsearch(value.trim()), 300);
	}

	const sortLabels: Record<SortField, string> = {
		title: 'Title',
		author: 'Author',
		series: 'Series',
		added: 'Date added',
		pages: 'Pages',
		price: 'Price'
	};
	const groupLabels: Record<(typeof GROUPS)[number], string> = {
		none: 'No grouping',
		author: 'Group: Author',
		series: 'Group: Series',
		publisher: 'Group: Publisher',
		location: 'Group: Location',
		reading: 'Group: Reading status',
		addedMonth: 'Group: Month added'
	};

	const views = [
		{ id: 'covers', label: 'Covers', icon: LayoutGrid },
		{ id: 'table', label: 'Table', icon: Table2 },
		{ id: 'stacked', label: 'Stacked', icon: Layers }
	] as const;
</script>

<div class="flex flex-wrap items-center gap-3">
	<label class="relative min-w-[min(15rem,100%)] flex-1">
		<span class="sr-only">Search books</span>
		<Search size={18} class="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
		<input
			type="search"
			bind:value
			oninput={input}
			placeholder="Search title, author, ISBN…"
			class="input mt-0 h-12 bg-card pl-11 text-base shadow-sm"
		/>
	</label>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					variant="outline"
					size="lg"
					class="h-12 bg-card px-5 shadow-sm"
					aria-label="Sort by {sortLabels[query.sort]}, {query.dir === 'asc'
						? 'ascending'
						: 'descending'}"
					{...props}
				>
					{#if query.dir === 'asc'}<ArrowUpAZ />{:else}<ArrowDownAZ />{/if}
					{sortLabels[query.sort]}
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start" class="w-52">
			<DropdownMenu.Label>Sort by</DropdownMenu.Label>
			<DropdownMenu.RadioGroup
				value={query.sort}
				onValueChange={(v) => onchange({ sort: v as SortField, dir: defaultDir(v as SortField) })}
			>
				{#each SORTS as s (s)}
					<DropdownMenu.RadioItem value={s}>{sortLabels[s]}</DropdownMenu.RadioItem>
				{/each}
			</DropdownMenu.RadioGroup>
			<DropdownMenu.Separator />
			<DropdownMenu.RadioGroup
				value={query.dir}
				onValueChange={(v) => onchange({ dir: v as LibraryQuery['dir'] })}
			>
				<DropdownMenu.RadioItem value="asc">Ascending</DropdownMenu.RadioItem>
				<DropdownMenu.RadioItem value="desc">Descending</DropdownMenu.RadioItem>
			</DropdownMenu.RadioGroup>
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<select
		class="input mt-0 h-12 w-auto bg-card pl-4 shadow-sm"
		aria-label="Group by"
		value={query.group}
		onchange={(e) => onchange({ group: e.currentTarget.value as LibraryQuery['group'] })}
	>
		{#each GROUPS as g (g)}<option value={g}>{groupLabels[g]}</option>{/each}
	</select>

	<Button
		variant="outline"
		size="icon"
		class="relative size-12 bg-card shadow-sm"
		aria-label="Filters"
		title="Filters"
		aria-expanded={filtersOpen}
		aria-controls="filters-panel"
		onclick={onfilters}
	>
		<SlidersHorizontal />
		{#if filterCount}
			<span
				class="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
				>{filterCount}</span
			>
		{/if}
	</Button>

	<div class="flex rounded-full border border-border bg-muted p-1" role="group" aria-label="View">
		{#each views as v (v.id)}
			<button
				type="button"
				aria-label={v.label}
				aria-pressed={query.view === v.id}
				title={v.label}
				class={cn(
					'grid size-10 place-items-center rounded-full transition',
					query.view === v.id
						? 'bg-card text-primary shadow-sm'
						: 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => onchange({ view: v.id as View })}
			>
				<v.icon size={18} />
			</button>
		{/each}
	</div>
</div>
