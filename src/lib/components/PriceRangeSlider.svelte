<script lang="ts">
	import RangeSlider from './RangeSlider.svelte';
	import { parsePriceRange } from '#lib/library/ranges.js';

	type Props = {
		/** Current filter text, e.g. "10-20". */
		price: string;
		/** Lowest and highest price in the library (major units), or null when there are none. */
		bounds: { min: number; max: number } | null;
		currency: string;
		onchange: (price: string) => void;
	};

	let { price, bounds, currency, onchange }: Props = $props();

	const parsed = $derived(parsePriceRange(price));
	const span = $derived(bounds ? bounds.max - bounds.min : 0);

	const money = (n: number) =>
		new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency,
			maximumFractionDigits: n % 1 ? 2 : 0
		}).format(n);

	/** An open end stays open, so the text is "10-", "-20" or "10-20"; both open clears the filter. */
	const text = (lo: number | null, hi: number | null) =>
		lo === null && hi === null ? '' : `${lo ?? ''}-${hi ?? ''}`;
</script>

<RangeSlider
	{bounds}
	lo={parsed?.min ?? null}
	hi={parsed?.max ?? null}
	step={span > 200 ? 5 : span > 40 ? 1 : 0.5}
	label="Price"
	emptyText="Price: none yet"
	format={money}
	ariaLabel="Price paid range"
	oncommit={(lo, hi) => onchange(text(lo, hi))}
/>
