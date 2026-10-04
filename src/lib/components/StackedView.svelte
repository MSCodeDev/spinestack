<script lang="ts">
	import { modalHref } from '#lib/modal-url.js';
	import GroupHeading from './GroupHeading.svelte';
	import type { Segment } from '#lib/library/groups.js';
	import type { GroupField } from '#lib/library/query.js';
	import type { BookListItem } from '#lib/types.js';

	let { segments, group }: { segments: Segment[]; group: GroupField } = $props();

	const PILE = 12;

	const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

	/** Spine thickness follows page count; width and offset vary a little so the pile looks hand-stacked. */
	function spine(book: BookListItem) {
		const h = hash(book.id);
		const height = Math.min(64, Math.max(26, Math.round((book.pageCount ?? 250) / 9)));
		const width = 210 + (h % 90);
		const offset = (h >>> 3) % 28;
		const color = book.coverColor ?? `hsl(${hash(book.title) % 360} 35% 38%)`;
		return `height:${height}px;width:${width}px;margin-left:${offset}px;background:${color}`;
	}

	const piles = (items: BookListItem[]) =>
		Array.from({ length: Math.ceil(items.length / PILE) }, (_, i) =>
			items.slice(i * PILE, (i + 1) * PILE)
		);
</script>

<div class="space-y-10">
	{#each segments as segment (segment.label ?? '\u0000none')}
		<section class="space-y-4">
			{#if group !== 'none'}<GroupHeading
					field={group}
					label={segment.label}
					count={segment.count}
				/>{/if}
			<div class="flex flex-wrap items-end gap-x-12 gap-y-8">
				{#each piles(segment.items) as pile, i (i)}
					<ul
						class="flex w-[340px] flex-col gap-0.5 border-b-4 border-stone-400 pb-0 dark:border-stone-600"
					>
						{#each pile as book (book.id)}
							<li>
								<a
									href={modalHref({ book: book.id })}
									style={spine(book)}
									class="flex items-center justify-between gap-3 overflow-hidden rounded-sm px-3 text-white shadow-sm ring-1 ring-black/20 transition hover:brightness-110"
									title={book.title}
								>
									<span class="truncate text-sm font-semibold">{book.title}</span>
									{#if book.authors.length}
										<span class="shrink-0 truncate text-xs opacity-80">{book.authors[0]}</span>
									{/if}
								</a>
							</li>
						{/each}
					</ul>
				{/each}
			</div>
		</section>
	{/each}
</div>
