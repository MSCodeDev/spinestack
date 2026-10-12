<script lang="ts">
	import { Layers, Library, PenLine } from '@lucide/svelte';
	import BlobShape from './BlobShape.svelte';
	import type { Stats } from '#lib/types.js';

	let { stats }: { stats: Stats } = $props();

	// Every tile gets its own shape, and morphs into another on hover.
	const tiles = $derived([
		{
			label: 'Books',
			value: String(stats.owned),
			hint: `+${stats.addedThisMonth} this month`,
			icon: Library,
			tint: 'bg-tile-lilac soft-a hover:soft-d'
		},
		{
			label: 'Series',
			value: String(stats.series),
			hint: 'collected',
			icon: Layers,
			tint: 'bg-tile-sky soft-e hover:soft-b'
		},
		{
			label: 'Authors',
			value: String(stats.authors),
			hint: 'and counting',
			icon: PenLine,
			tint: 'bg-tile-mint soft-f hover:soft-c'
		}
	]);
</script>

<dl class="grid grid-cols-3 gap-2 sm:gap-3">
	{#each tiles as tile, i (tile.label)}
		<div
			class="relative min-w-0 overflow-hidden px-3 py-3 transition-shape hover:-translate-y-0.5 sm:px-5 sm:py-4 {tile.tint}"
		>
			<BlobShape
				seed={i * 13 + 5}
				class="pointer-events-none absolute -top-10 -right-8 size-32 text-foreground/[0.045]"
			/>
			<tile.icon
				class="pointer-events-none absolute -right-3 -bottom-3 size-20 rotate-12 opacity-[0.13]"
				aria-hidden="true"
			/>
			<dt
				class="relative truncate text-[0.65rem] font-bold tracking-wider text-foreground/60 uppercase sm:text-xs"
			>
				{tile.label}
			</dt>
			<dd
				class="relative mt-1 truncate font-display leading-none font-bold {tile.value.length > 5
					? 'text-3xl sm:text-4xl'
					: 'text-4xl sm:text-5xl'}"
			>
				{tile.value}
			</dd>
			<p class="relative mt-1.5 hidden truncate text-xs font-medium text-foreground/60 sm:block">
				{tile.hint}
			</p>
		</div>
	{/each}
</dl>
