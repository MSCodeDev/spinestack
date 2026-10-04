<script lang="ts">
	import { formatMoney } from '#lib/money.js';
	import type { Stats } from '#lib/types.js';

	let { stats }: { stats: Stats } = $props();

	const money = (items: Stats['spentTotal']) =>
		items.map((s) => formatMoney(s.minor, s.currency)).join(' · ') || '—';

	const tiles = $derived([
		{ label: 'Books', value: stats.owned, hint: `+${stats.addedThisMonth} this month` },
		{ label: 'Wishlist', value: stats.wishlist },
		{
			label: 'Spent',
			value: money(stats.spentTotal),
			hint: `${money(stats.spentThisMonth)} this month`
		},
		{ label: 'Reading', value: stats.reading, hint: `${stats.readThisYear} read this year` },
		{ label: 'Series', value: stats.series },
		{ label: 'Authors', value: stats.authors }
	]);
</script>

<dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
	{#each tiles as tile (tile.label)}
		<div
			class="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
		>
			<dt class="text-xs tracking-wide text-stone-500 uppercase">{tile.label}</dt>
			<dd class="mt-1 text-xl font-semibold">{tile.value}</dd>
			{#if tile.hint}<p class="text-xs text-stone-500">{tile.hint}</p>{/if}
		</div>
	{/each}
</dl>
