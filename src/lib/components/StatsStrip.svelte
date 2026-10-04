<script lang="ts">
	import { Heart, Layers, Library, PenLine, BookOpen, Wallet } from '@lucide/svelte';
	import { formatMoney } from '#lib/money.js';
	import type { Stats } from '#lib/types.js';

	let { stats }: { stats: Stats } = $props();

	const money = (items: Stats['spentTotal']) =>
		items.map((s) => formatMoney(s.minor, s.currency)).join(' · ') || '—';

	const tiles = $derived([
		{
			label: 'Books',
			value: String(stats.owned),
			hint: `+${stats.addedThisMonth} this month`,
			icon: Library,
			tint: 'bg-tile-coral'
		},
		{
			label: 'Wishlist',
			value: String(stats.wishlist),
			hint: 'still to find',
			icon: Heart,
			tint: 'bg-tile-lilac'
		},
		{
			label: 'Spent',
			value: money(stats.spentTotal),
			hint: `${money(stats.spentThisMonth)} this month`,
			icon: Wallet,
			tint: 'bg-tile-butter'
		},
		{
			label: 'Reading',
			value: String(stats.reading),
			hint: `${stats.readThisYear} read this year`,
			icon: BookOpen,
			tint: 'bg-tile-teal'
		},
		{
			label: 'Series',
			value: String(stats.series),
			hint: 'collected',
			icon: Layers,
			tint: 'bg-tile-sky'
		},
		{
			label: 'Authors',
			value: String(stats.authors),
			hint: 'and counting',
			icon: PenLine,
			tint: 'bg-tile-mint'
		}
	]);
</script>

<dl
	class="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6"
>
	{#each tiles as tile (tile.label)}
		<div
			class="relative min-w-36 shrink-0 snap-start overflow-hidden rounded-3xl p-4 sm:min-w-0 {tile.tint}"
		>
			<tile.icon
				class="pointer-events-none absolute -right-3 -bottom-3 size-20 rotate-12 opacity-[0.13]"
				aria-hidden="true"
			/>
			<dt class="text-xs font-bold tracking-wider text-foreground/60 uppercase">{tile.label}</dt>
			<dd
				class="mt-1 truncate font-display leading-none font-bold {tile.value.length > 5
					? 'text-4xl'
					: 'text-5xl'}"
			>
				{tile.value}
			</dd>
			<p class="mt-1.5 truncate text-xs font-medium text-foreground/60">{tile.hint}</p>
		</div>
	{/each}
</dl>
