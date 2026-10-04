<script lang="ts">
	import { modalHref } from '#lib/modal-url.js';
	import { ArrowDown, ArrowUp, Columns3 } from '@lucide/svelte';
	import GroupHeading from './GroupHeading.svelte';
	import { formatMoney } from '#lib/money.js';
	import type { Segment } from '#lib/library/groups.js';
	import type { GroupField, LibraryQuery, SortField } from '#lib/library/query.js';
	import type { BookListItem } from '#lib/types.js';

	type Props = {
		segments: Segment[];
		group: GroupField;
		sort: LibraryQuery['sort'];
		dir: LibraryQuery['dir'];
		onsort: (field: SortField) => void;
	};

	let { segments, group, sort, dir, onsort }: Props = $props();

	type Column = {
		id: string;
		label: string;
		sort?: SortField;
		value: (b: BookListItem) => string;
		align?: 'right';
	};

	const columns: Column[] = [
		{ id: 'author', label: 'Author', sort: 'author', value: (b) => b.authors.join(', ') },
		{
			id: 'series',
			label: 'Series',
			sort: 'series',
			value: (b) => (b.series ? `${b.series}${b.seriesNumber ? ` #${b.seriesNumber}` : ''}` : '')
		},
		{ id: 'publisher', label: 'Publisher', value: (b) => b.publisher ?? '' },
		{ id: 'location', label: 'Location', value: (b) => b.location ?? '' },
		{ id: 'status', label: 'Status', value: (b) => b.status },
		{
			id: 'pages',
			label: 'Pages',
			sort: 'pages',
			align: 'right',
			value: (b) => String(b.pageCount ?? '')
		},
		{
			id: 'paid',
			label: 'Paid',
			sort: 'price',
			align: 'right',
			value: (b) => (b.paidPrice !== null && b.currency ? formatMoney(b.paidPrice, b.currency) : '')
		},
		{ id: 'bought', label: 'Bought', sort: 'bought', value: (b) => b.boughtAt ?? '' },
		{
			id: 'added',
			label: 'Added',
			sort: 'added',
			value: (b) => new Date(b.createdAt).toLocaleDateString()
		}
	];

	const STORAGE_KEY = 'spinestack:columns';
	const defaults = ['author', 'series', 'location', 'pages', 'paid', 'bought'];

	function stored(): string[] {
		try {
			const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
			if (Array.isArray(value)) return value;
		} catch {
			// storage unavailable or corrupt; use defaults
		}
		return defaults;
	}

	let visible = $derived(stored());

	function toggle(id: string) {
		visible = visible.includes(id) ? visible.filter((c) => c !== id) : [...visible, id];
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
		} catch {
			// not persisted
		}
	}

	const shown = $derived(columns.filter((c) => visible.includes(c.id)));
</script>

<div class="space-y-2">
	<details class="relative flex justify-end">
		<summary class="btn cursor-pointer list-none"><Columns3 size={16} /> Columns</summary>
		<div
			class="absolute top-full right-0 z-10 mt-1 w-44 space-y-1 rounded-md border border-border bg-card p-2 shadow-lg"
		>
			{#each columns as c (c.id)}
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" checked={visible.includes(c.id)} onchange={() => toggle(c.id)} />
					{c.label}
				</label>
			{/each}
		</div>
	</details>

	<div class="overflow-x-auto rounded-lg border border-border bg-card">
		<table class="w-full text-left text-sm">
			<thead class="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
				<tr>
					{@render head('Title', 'title')}
					{#each shown as c (c.id)}{@render head(c.label, c.sort, c.align)}{/each}
				</tr>
			</thead>
			<tbody>
				{#each segments as segment (segment.label ?? '\u0000none')}
					{#if group !== 'none'}
						<tr class="bg-muted">
							<td colspan={shown.length + 1} class="px-3 py-2"
								><GroupHeading field={group} label={segment.label} count={segment.count} /></td
							>
						</tr>
					{/if}
					{#each segment.items as book (book.id)}
						<tr class="border-b border-border last:border-0 hover:bg-muted">
							<td class="px-3 py-2 font-medium">
								<a href={modalHref({ book: book.id })} class="hover:underline">{book.title}</a>
							</td>
							{#each shown as c (c.id)}
								<td
									class="px-3 py-2 whitespace-nowrap {c.align === 'right'
										? 'text-right tabular-nums'
										: ''}">{c.value(book)}</td
								>
							{/each}
						</tr>
					{/each}
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#snippet head(label: string, field?: SortField, align?: 'right')}
	<th
		class="px-3 py-2 font-medium {align === 'right' ? 'text-right' : ''}"
		aria-sort={field && sort === field ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
	>
		{#if field}
			<button
				type="button"
				class="inline-flex items-center gap-1 uppercase hover:text-foreground dark:hover:text-white"
				onclick={() => onsort(field)}
			>
				{label}
				{#if sort === field}{#if dir === 'asc'}<ArrowUp size={12} />{:else}<ArrowDown
							size={12}
						/>{/if}{/if}
			</button>
		{:else}
			{label}
		{/if}
	</th>
{/snippet}
