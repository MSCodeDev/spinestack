<script lang="ts">
	import RangeSlider from './RangeSlider.svelte';
	import { dayToIso, isoToDay } from '#lib/library/days.js';
	import { parseDateRange } from '#lib/library/ranges.js';

	type Props = {
		/** Current filter text, e.g. "2024-01-01..2024-06-30". */
		bought: string;
		/** Earliest and latest bought date in the library (YYYY-MM-DD), or null when there are none. */
		bounds: { min: string; max: string } | null;
		onchange: (bought: string) => void;
	};

	let { bought, bounds, onchange }: Props = $props();

	const parsed = $derived(parseDateRange(bought));
	const range = $derived(bounds ? { min: isoToDay(bounds.min), max: isoToDay(bounds.max) } : null);

	const show = (day: number) =>
		new Date(day * 86_400_000).toLocaleDateString(undefined, {
			timeZone: 'UTC',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});

	/** An open end stays open: "2024-01-01..", "..2024-06-30" or both; neither clears the filter. */
	const text = (lo: number | null, hi: number | null) =>
		lo === null && hi === null
			? ''
			: `${lo === null ? '' : dayToIso(lo)}..${hi === null ? '' : dayToIso(hi)}`;
</script>

<RangeSlider
	bounds={range}
	lo={parsed?.from ? isoToDay(parsed.from) : null}
	hi={parsed?.to ? isoToDay(parsed.to) : null}
	label="Date"
	emptyText="Date: none yet"
	format={show}
	ariaLabel="Bought date range"
	oncommit={(lo, hi) => onchange(text(lo, hi))}
/>
