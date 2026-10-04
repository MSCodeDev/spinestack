<script lang="ts">
	import { ArrowDownAZ, ArrowUpAZ } from '@lucide/svelte';
	import Drawer from './Drawer.svelte';
	import ChipInput from './ChipInput.svelte';
	import {
		GROUPS,
		SORTS,
		defaultDir,
		type FieldSearchParam,
		type LibraryQuery,
		type SortField
	} from '#lib/library/query.js';
	import type { Options } from '#lib/types.js';

	type Props = {
		open: boolean;
		query: LibraryQuery;
		options: Options;
		onchange: (patch: Partial<LibraryQuery>) => void;
		onclear: () => void;
	};

	let { open = $bindable(), query, options, onchange, onclear }: Props = $props();

	const sortLabels: Record<SortField, string> = {
		title: 'Title',
		author: 'Author',
		series: 'Series',
		added: 'Date added',
		bought: 'Date bought',
		arrived: 'Date arrived',
		pages: 'Pages',
		price: 'Price paid'
	};
	const groupLabels: Record<(typeof GROUPS)[number], string> = {
		none: 'No grouping',
		author: 'Author',
		series: 'Series',
		publisher: 'Publisher',
		location: 'Location',
		status: 'Status',
		reading: 'Reading status',
		addedMonth: 'Month added',
		boughtYear: 'Year bought'
	};
	const fieldSearches: [FieldSearchParam, string][] = [
		['qt', 'Title'],
		['qa', 'Author'],
		['qp', 'Publisher'],
		['qi', 'ISBN']
	];

	// Text-like inputs wait for a pause in typing before updating the URL.
	let timer: ReturnType<typeof setTimeout>;
	const later = (fn: () => void) => {
		clearTimeout(timer);
		timer = setTimeout(fn, 300);
	};

	const num = (value: string) => (value.trim() === '' ? null : Number(value));

	let author = $derived(query.author);
	let series = $derived(query.series);
	let publisher = $derived(query.publisher);
	let location = $derived(query.location);
	let tag = $derived(query.tag);
</script>

<Drawer bind:open title="Filters & sorting">
	<div class="space-y-6 text-sm">
		<section class="space-y-2">
			<h3 class="font-display text-2xl leading-none font-bold">Search in field</h3>
			<div class="grid grid-cols-2 gap-3">
				{#each fieldSearches as [key, label] (key)}
					<label class="block font-medium">
						{label}
						<input
							class="input"
							value={query.fields[key]}
							oninput={(e) => {
								const value = e.currentTarget.value.trim();
								later(() => onchange({ fields: { ...query.fields, [key]: value } }));
							}}
						/>
					</label>
				{/each}
			</div>
		</section>

		<section class="space-y-2">
			<h3 class="font-display text-2xl leading-none font-bold">Sort &amp; group</h3>
			<div class="flex items-end gap-2">
				<label class="block flex-1 font-medium">
					Sort by
					<select
						class="input"
						value={query.sort}
						onchange={(e) => {
							const sort = e.currentTarget.value as SortField;
							onchange({ sort, dir: defaultDir(sort) });
						}}
					>
						{#each SORTS as s (s)}<option value={s}>{sortLabels[s]}</option>{/each}
					</select>
				</label>
				<button
					type="button"
					class="btn border border-border"
					aria-label={query.dir === 'asc' ? 'Ascending' : 'Descending'}
					onclick={() => onchange({ dir: query.dir === 'asc' ? 'desc' : 'asc' })}
				>
					{#if query.dir === 'asc'}<ArrowUpAZ size={16} /> Asc{:else}<ArrowDownAZ size={16} /> Desc{/if}
				</button>
			</div>
			<label class="block font-medium">
				Group by
				<select
					class="input"
					value={query.group}
					onchange={(e) => onchange({ group: e.currentTarget.value as LibraryQuery['group'] })}
				>
					{#each GROUPS as g (g)}<option value={g}>{groupLabels[g]}</option>{/each}
				</select>
			</label>
		</section>

		<section class="space-y-3">
			<h3 class="font-display text-2xl leading-none font-bold">Filters</h3>
			<div class="grid grid-cols-3 gap-3">
				<label class="block font-medium">
					Status
					<select
						class="input"
						value={query.status ?? ''}
						onchange={(e) =>
							onchange({ status: (e.currentTarget.value || null) as LibraryQuery['status'] })}
					>
						<option value="">Any</option>
						<option value="owned">Owned</option>
						<option value="wishlist">Wishlist</option>
					</select>
				</label>
				<label class="block font-medium">
					Reading
					<select
						class="input"
						value={query.reading ?? ''}
						onchange={(e) =>
							onchange({ reading: (e.currentTarget.value || null) as LibraryQuery['reading'] })}
					>
						<option value="">Any</option>
						<option value="unread">Unread</option>
						<option value="reading">Reading</option>
						<option value="read">Read</option>
					</select>
				</label>
				<label class="block font-medium">
					Cover
					<select
						class="input"
						value={query.cover === null ? '' : query.cover ? 'yes' : 'no'}
						onchange={(e) =>
							onchange({
								cover: e.currentTarget.value === '' ? null : e.currentTarget.value === 'yes'
							})}
					>
						<option value="">Any</option>
						<option value="yes">Has cover</option>
						<option value="no">No cover</option>
					</select>
				</label>
			</div>

			<div class="font-medium">
				Authors<ChipInput
					bind:values={author}
					suggestions={options.authors}
					placeholder="Any author"
					onchange={(v) => onchange({ author: v })}
				/>
			</div>
			<div class="font-medium">
				Series<ChipInput
					bind:values={series}
					suggestions={options.series}
					placeholder="Any series"
					onchange={(v) => onchange({ series: v })}
				/>
			</div>
			<div class="font-medium">
				Publishers<ChipInput
					bind:values={publisher}
					suggestions={options.publishers}
					placeholder="Any publisher"
					onchange={(v) => onchange({ publisher: v })}
				/>
			</div>
			<div class="font-medium">
				Locations<ChipInput
					bind:values={location}
					suggestions={options.locations}
					placeholder="Any location"
					onchange={(v) => onchange({ location: v })}
				/>
			</div>
			<div class="font-medium">
				Tags<ChipInput
					bind:values={tag}
					suggestions={options.tags}
					placeholder="Any tag"
					onchange={(v) => onchange({ tag: v })}
				/>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<label class="block font-medium">
					Paid at least
					<input
						class="input"
						inputmode="decimal"
						value={query.priceMin ?? ''}
						oninput={(e) => {
							const value = num(e.currentTarget.value);
							later(() => onchange({ priceMin: value }));
						}}
					/>
				</label>
				<label class="block font-medium">
					Paid at most
					<input
						class="input"
						inputmode="decimal"
						value={query.priceMax ?? ''}
						oninput={(e) => {
							const value = num(e.currentTarget.value);
							later(() => onchange({ priceMax: value }));
						}}
					/>
				</label>
				<label class="block font-medium">
					Bought from
					<input
						class="input"
						type="date"
						value={query.boughtFrom ?? ''}
						onchange={(e) => onchange({ boughtFrom: e.currentTarget.value || null })}
					/>
				</label>
				<label class="block font-medium">
					Bought to
					<input
						class="input"
						type="date"
						value={query.boughtTo ?? ''}
						onchange={(e) => onchange({ boughtTo: e.currentTarget.value || null })}
					/>
				</label>
			</div>
		</section>
	</div>

	{#snippet footer()}
		<button type="button" class="btn" onclick={onclear}>Reset all</button>
		<button type="button" class="btn btn-primary" onclick={() => (open = false)}>Done</button>
	{/snippet}
</Drawer>
