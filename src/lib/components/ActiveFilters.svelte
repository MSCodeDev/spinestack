<script lang="ts">
	import { X } from '@lucide/svelte';
	import { LIST_FILTERS, type LibraryQuery } from '#lib/library/query.js';

	let {
		query,
		onchange,
		onclear
	}: {
		query: LibraryQuery;
		onchange: (patch: Partial<LibraryQuery>) => void;
		onclear: () => void;
	} = $props();

	type Chip = { id: string; label: string; remove: Partial<LibraryQuery> };

	const chips = $derived.by(() => {
		const out: Chip[] = [];
		for (const key of LIST_FILTERS) {
			for (const v of query[key]) {
				out.push({
					id: `${key}:${v}`,
					label: `${key}: ${v}`,
					remove: { [key]: query[key].filter((x) => x !== v) }
				});
			}
		}
		if (query.reading) {
			out.push({ id: 'reading', label: `Reading: ${query.reading}`, remove: { reading: null } });
		}
		if (query.price)
			out.push({ id: 'price', label: `Paid: ${query.price}`, remove: { price: '' } });
		if (query.bought) {
			out.push({ id: 'bought', label: `Bought: ${query.bought}`, remove: { bought: '' } });
		}
		return out;
	});
</script>

{#if chips.length}
	<div class="flex flex-wrap items-center gap-2">
		{#each chips as chip (chip.id)}
			<span
				class="flex items-center gap-1 rounded-full bg-secondary py-0.5 pr-1 pl-3 text-sm font-semibold text-secondary-foreground"
			>
				{chip.label}
				<button
					type="button"
					class="grid size-5 place-items-center rounded-full hover:bg-foreground/10"
					aria-label="Remove filter {chip.label}"
					onclick={() => onchange(chip.remove)}
				>
					<X size={12} />
				</button>
			</span>
		{/each}
		<button type="button" class="text-sm text-muted-foreground underline" onclick={onclear}>
			Clear all
		</button>
	</div>
{/if}
