<script lang="ts">
	import { slide } from 'svelte/transition';
	import DateRangeSlider from './DateRangeSlider.svelte';
	import ChipInput from './ChipInput.svelte';
	import PriceRangeSlider from './PriceRangeSlider.svelte';
	import type { LibraryQuery } from '#lib/library/query.js';
	import type { Options } from '#lib/types.js';

	type Props = {
		open: boolean;
		query: LibraryQuery;
		options: Options;
		/** Lowest and highest paid price in the library, for the slider. */
		priceBounds: { min: number; max: number } | null;
		/** Earliest and latest day a book was added, for the slider. */
		dateBounds: { min: string; max: string } | null;
		currency: string;
		onchange: (patch: Partial<LibraryQuery>) => void;
	};

	let { open, query, options, priceBounds, dateBounds, currency, onchange }: Props = $props();

	let series = $derived(query.series);
	let publisher = $derived(query.publisher);
	let location = $derived(query.location);
</script>

{#if open}
	<section
		id="filters-panel"
		aria-label="Filters"
		transition:slide={{ duration: 250 }}
		class="soft-b border border-border bg-card p-6 text-sm shadow-sm sm:p-8"
	>
		<div class="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<select
				class="input mt-0"
				aria-label="Reading status"
				value={query.reading ?? ''}
				onchange={(e) =>
					onchange({ reading: (e.currentTarget.value || null) as LibraryQuery['reading'] })}
			>
				<option value="">Any reading status</option>
				<option value="unread">Unread</option>
				<option value="reading">Reading</option>
				<option value="read">Read</option>
			</select>
			<ChipInput
				bind:values={series}
				suggestions={options.series}
				placeholder="Any series"
				label="Series"
				class="mt-0"
				onchange={(v) => onchange({ series: v })}
			/>
			<ChipInput
				bind:values={publisher}
				suggestions={options.publishers}
				placeholder="Any publisher"
				label="Publishers"
				class="mt-0"
				onchange={(v) => onchange({ publisher: v })}
			/>
			<ChipInput
				bind:values={location}
				suggestions={options.locations}
				placeholder="Any location"
				label="Locations"
				class="mt-0"
				onchange={(v) => onchange({ location: v })}
			/>
			<div class="sm:col-span-2">
				<PriceRangeSlider
					price={query.price}
					bounds={priceBounds}
					{currency}
					onchange={(price) => onchange({ price })}
				/>
			</div>
			<div class="sm:col-span-2">
				<DateRangeSlider
					date={query.date}
					bounds={dateBounds}
					onchange={(date) => onchange({ date })}
				/>
			</div>
		</div>
	</section>
{/if}
