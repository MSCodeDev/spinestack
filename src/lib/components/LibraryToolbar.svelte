<script lang="ts">
	import { Layers, LayoutGrid, Search, SlidersHorizontal, Table2 } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { View } from '#lib/library/query.js';
	import { cn } from '#lib/utils.js';

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

<div class="flex flex-wrap items-center gap-3">
	<label class="relative min-w-60 flex-1">
		<span class="sr-only">Search books</span>
		<Search size={18} class="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
		<input
			type="search"
			bind:value
			oninput={input}
			placeholder="Search title, author, ISBN…"
			class="input mt-0 h-12 bg-card pl-11 text-base shadow-sm"
		/>
	</label>

	<Button variant="outline" size="lg" class="h-12 bg-card px-5 shadow-sm" onclick={onfilters}>
		<SlidersHorizontal /> Filters
		{#if filterCount}
			<span
				class="grid size-5 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
				>{filterCount}</span
			>
		{/if}
	</Button>

	<div class="flex rounded-full border border-border bg-muted p-1" role="group" aria-label="View">
		{#each views as v (v.id)}
			<button
				type="button"
				aria-label={v.label}
				aria-pressed={view === v.id}
				title={v.label}
				class={cn(
					'grid size-10 place-items-center rounded-full transition',
					view === v.id
						? 'bg-card text-primary shadow-sm'
						: 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => onview(v.id)}
			>
				<v.icon size={18} />
			</button>
		{/each}
	</div>
</div>
