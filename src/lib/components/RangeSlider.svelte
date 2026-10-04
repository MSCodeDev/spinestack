<script lang="ts">
	import { Slider } from '#lib/components/ui/slider/index.js';

	type Props = {
		/** Lowest and highest value available, or null when there is nothing to filter. */
		bounds: { min: number; max: number } | null;
		/** Current limits; null means unlimited on that side. */
		lo: number | null;
		hi: number | null;
		step?: number;
		/** Shown before the values, e.g. "Price paid". */
		label: string;
		emptyText: string;
		format: (n: number) => string;
		ariaLabel: string;
		/** Called when a handle is released. A handle at the end of the track reports null (no limit). */
		oncommit: (lo: number | null, hi: number | null) => void;
	};

	let { bounds, lo, hi, step = 1, label, emptyText, format, ariaLabel, oncommit }: Props = $props();

	const clamp = (n: number) => Math.min(Math.max(n, bounds?.min ?? 0), bounds?.max ?? 0);
	const from = $derived(clamp(lo ?? bounds?.min ?? 0));
	const to = $derived(Math.max(clamp(hi ?? bounds?.max ?? 0), from));

	// Follows the filter, but moves freely while dragging.
	let range = $derived<number[]>([from, to]);

	const filtered = $derived(!!bounds && (range[0] > bounds.min || range[1] < bounds.max));
	const readout = $derived(
		!bounds
			? emptyText
			: !filtered
				? `${label}: any`
				: `${label}: ${format(range[0])} – ${format(range[1])}`
	);

	function commit(values: number[]) {
		if (!bounds) return;
		oncommit(
			values[0] <= bounds.min ? null : values[0],
			values[1] >= bounds.max ? null : values[1]
		);
	}
</script>

<div
	class="flex h-10 items-center gap-4 rounded-full border border-input bg-card px-4 shadow-xs {bounds
		? ''
		: 'opacity-60'}"
>
	<span class="shrink-0 text-sm {filtered ? 'font-semibold' : 'text-muted-foreground'}"
		>{readout}</span
	>
	{#if bounds}
		<Slider
			type="multiple"
			bind:value={range}
			min={bounds.min}
			max={bounds.max}
			{step}
			onValueCommit={commit}
			aria-label={ariaLabel}
			class="min-w-24 flex-1"
		/>
	{/if}
</div>
