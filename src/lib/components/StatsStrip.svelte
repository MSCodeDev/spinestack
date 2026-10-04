<script lang="ts">
	import { Heart, Layers, Library, PenLine, BookOpen, Wallet } from '@lucide/svelte';
	import BlobShape from './BlobShape.svelte';
	import { formatMoney } from '#lib/money.js';
	import type { Stats } from '#lib/types.js';

	let { stats }: { stats: Stats } = $props();

	const money = (items: Stats['spentTotal']) =>
		items.map((s) => formatMoney(s.minor, s.currency)).join(' · ') || '—';

	// Every tile gets its own shape, and morphs into another on hover.
	const tiles = $derived([
		{
			label: 'Books',
			value: String(stats.owned),
			hint: `+${stats.addedThisMonth} this month`,
			icon: Library,
			tint: 'bg-tile-coral soft-a hover:soft-d'
		},
		{
			label: 'Wishlist',
			value: String(stats.wishlist),
			hint: 'still to find',
			icon: Heart,
			tint: 'bg-tile-lilac soft-b hover:soft-e'
		},
		{
			label: 'Spent',
			value: money(stats.spentTotal),
			hint: `${money(stats.spentThisMonth)} this month`,
			icon: Wallet,
			tint: 'bg-tile-butter soft-c hover:soft-f'
		},
		{
			label: 'Reading',
			value: String(stats.reading),
			hint: `${stats.readThisYear} read this year`,
			icon: BookOpen,
			tint: 'bg-tile-teal soft-d hover:soft-a'
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

<dl
	class="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pt-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6"
>
	{#each tiles as tile, i (tile.label)}
		<div
			class="relative min-w-36 shrink-0 snap-start overflow-hidden px-5 py-4 transition-shape hover:-translate-y-0.5 sm:min-w-0 {tile.tint}"
		>
			<BlobShape
				seed={i * 13 + 5}
				class="pointer-events-none absolute -top-10 -right-8 size-32 text-foreground/[0.045]"
			/>
			<tile.icon
				class="pointer-events-none absolute -right-3 -bottom-3 size-20 rotate-12 opacity-[0.13]"
				aria-hidden="true"
			/>
			<dt class="relative text-xs font-bold tracking-wider text-foreground/60 uppercase">
				{tile.label}
			</dt>
			<dd
				class="relative mt-1 truncate font-display leading-none font-bold {tile.value.length > 5
					? 'text-4xl'
					: 'text-5xl'}"
			>
				{tile.value}
			</dd>
			<p class="relative mt-1.5 truncate text-xs font-medium text-foreground/60">{tile.hint}</p>
		</div>
	{/each}
</dl>
