<script lang="ts">
	import { LayoutGrid, Layers, Search, SlidersHorizontal, Table2 } from '@lucide/svelte';
	import type { View } from '#lib/library/query.js';

	type Props = {
		q: string;
		view: View;
		filterCount: number;
		onsearch: (q: string) => void;
		onview: (view: View) => void;
		onfilters: () => void;
	};

	let { q, view, filterCount, onsearch, onview, onfilters }: Props = $props();

	// Follows the URL, but can be typed over until the next navigation.
	let value = $derived(q);
	let timer: ReturnType<typeof setTimeout>;

	function input() {
		clearTimeout(timer);
		timer = setTimeout(() => onsearch(value.trim()), 300);
	}

	const views = [
		{ id: 'covers', label: 'Covers', icon: LayoutGrid },
		{ id: 'table', label: 'Table', icon: Table2 },
		{ id: 'stacked', label: 'Stacked', icon: Layers }
	] as const;
</script>

<div class="flex items-center gap-2">
	<label class="relative flex-1">
		<span class="sr-only">Search books</span>
		<Search size={16} class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
		<input
			type="search"
			bind:value
			oninput={input}
			placeholder="Search title, author, ISBN…"
			class="input mt-0 pl-9"
		/>
	</label>

	<button type="button" class="btn border border-border" onclick={onfilters}>
		<SlidersHorizontal size={16} /> Filters
		{#if filterCount}
			<span class="rounded-full bg-primary px-1.5 text-xs text-primary-foreground"
				>{filterCount}</span
			>
		{/if}
	</button>

	<div class="flex rounded-md border border-border p-0.5" role="group" aria-label="View">
		{#each views as v (v.id)}
			<button
				type="button"
				aria-label={v.label}
				aria-pressed={view === v.id}
				title={v.label}
				class="rounded p-1.5 {view === v.id
					? 'bg-primary text-primary-foreground'
					: 'hover:bg-muted '}"
				onclick={() => onview(v.id)}
			>
				<v.icon size={16} />
			</button>
		{/each}
	</div>
</div>
