<script lang="ts">
	import { X } from '@lucide/svelte';
	import {
		FIELD_SEARCHES,
		LIST_FILTERS,
		type FieldSearchParam,
		type LibraryQuery
	} from '#lib/library/query.js';

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
		for (const key of Object.keys(FIELD_SEARCHES) as FieldSearchParam[]) {
			const v = query.fields[key];
			if (v) {
				out.push({
					id: key,
					label: `${FIELD_SEARCHES[key]}: ${v}`,
					remove: { fields: { ...query.fields, [key]: '' } }
				});
			}
		}
		for (const key of LIST_FILTERS) {
			for (const v of query[key]) {
				out.push({
					id: `${key}:${v}`,
					label: `${key}: ${v}`,
					remove: { [key]: query[key].filter((x) => x !== v) }
				});
			}
		}
		if (query.status)
			out.push({ id: 'status', label: `Status: ${query.status}`, remove: { status: null } });
		if (query.reading)
			out.push({ id: 'reading', label: `Reading: ${query.reading}`, remove: { reading: null } });
		if (query.cover !== null) {
			out.push({
				id: 'cover',
				label: query.cover ? 'Has cover' : 'No cover',
				remove: { cover: null }
			});
		}
		if (query.priceMin !== null)
			out.push({ id: 'min', label: `Paid ≥ ${query.priceMin}`, remove: { priceMin: null } });
		if (query.priceMax !== null)
			out.push({ id: 'max', label: `Paid ≤ ${query.priceMax}`, remove: { priceMax: null } });
		if (query.boughtFrom)
			out.push({
				id: 'from',
				label: `Bought from ${query.boughtFrom}`,
				remove: { boughtFrom: null }
			});
		if (query.boughtTo)
			out.push({ id: 'to', label: `Bought to ${query.boughtTo}`, remove: { boughtTo: null } });
		return out;
	});
</script>

{#if chips.length}
	<div class="flex flex-wrap items-center gap-2">
		{#each chips as chip (chip.id)}
			<span
				class="flex items-center gap-1 rounded-full bg-secondary py-0.5 pr-1 pl-3 text-sm text-primary"
			>
				{chip.label}
				<button
					type="button"
					class="rounded-full p-0.5 hover:bg-secondary/70"
					aria-label="Remove filter {chip.label}"
					onclick={() => onchange(chip.remove)}
				>
					<X size={14} />
				</button>
			</span>
		{/each}
		<button type="button" class="text-sm text-muted-foreground underline" onclick={onclear}
			>Clear all</button
		>
	</div>
{/if}
