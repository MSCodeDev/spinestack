<script lang="ts">
	import { modalHref } from '#lib/modal-url.js';
	import { ArrowDown, ArrowUp, Columns3 } from '@lucide/svelte';
	import GroupHeading from './GroupHeading.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
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
		{
			id: 'pages',
			label: 'Pages',
			sort: 'pages',
			align: 'right',
			value: (b) => String(b.pageCount ?? '')
		},
		{
			id: 'paid',
			label: 'Price',
			sort: 'price',
			align: 'right',
			value: (b) => (b.paidPrice !== null && b.currency ? formatMoney(b.paidPrice, b.currency) : '')
		},
		{
			id: 'added',
			label: 'Added',
			sort: 'added',
			value: (b) => new Date(b.createdAt).toLocaleDateString()
		}
	];

	const STORAGE_KEY = 'spinestack:columns';
	const defaults = ['author', 'series', 'location', 'pages', 'paid', 'added'];

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

<div class="space-y-3">
	<div class="flex justify-end">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button variant="outline" size="sm" class="bg-card" {...props}
						><Columns3 /> Columns</Button
					>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-48">
				{#each columns as c (c.id)}
					<DropdownMenu.CheckboxItem
						checked={visible.includes(c.id)}
						onCheckedChange={() => toggle(c.id)}
					>
						{c.label}
					</DropdownMenu.CheckboxItem>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<div
		class="overflow-x-auto rounded-[1rem_1.4rem_1.1rem_1.3rem/1.3rem_1rem_1.4rem_1.1rem] border border-border bg-card shadow-sm"
	>
		<table class="w-full text-left text-sm">
			<thead class="bg-muted/60 text-xs tracking-wider text-muted-foreground uppercase">
				<tr>
					{@render head('Title', 'title')}
					{#each shown as c (c.id)}{@render head(c.label, c.sort, c.align)}{/each}
				</tr>
			</thead>
			<tbody>
				{#each segments as segment (segment.label ?? '\u0000none')}
					{#if group !== 'none'}
						<tr class="bg-muted/40">
							<td colspan={shown.length + 1} class="px-4 py-3">
								<GroupHeading field={group} label={segment.label} count={segment.count} />
							</td>
						</tr>
					{/if}
					{#each segment.items as book (book.id)}
						<tr class="border-t border-border/70 transition hover:bg-muted/50">
							<td class="px-4 py-3 font-bold">
								<a href={modalHref({ book: book.id })} class="hover:text-primary hover:underline"
									>{book.title}</a
								>
							</td>
							{#each shown as c (c.id)}
								<td
									class="px-4 py-3 whitespace-nowrap {c.align === 'right'
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
