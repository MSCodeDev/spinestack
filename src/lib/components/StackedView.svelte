<script lang="ts">
	import GroupHeading from './GroupHeading.svelte';
	import { placeholderColors, readableInk } from '#lib/library/placeholder.js';
	import { modalHref } from '#lib/modal-url.js';
	import type { Segment } from '#lib/library/groups.js';
	import type { GroupField } from '#lib/library/query.js';
	import type { BookListItem } from '#lib/types.js';

	let { segments, group }: { segments: Segment[]; group: GroupField } = $props();

	const PILE = 12;

	const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

	/**
	 * Spine thickness follows page count; width and offset vary a little so the pile looks hand-stacked.
	 * The colour is the cover's dominant colour, or a stable pastel when the book has no cover.
	 */
	function spine(book: BookListItem) {
		const h = hash(book.id);
		const height = Math.min(64, Math.max(30, Math.round((book.pageCount ?? 250) / 9)));
		const width = 220 + (h % 90);
		const offset = (h >>> 3) % 26;
		const fallback = placeholderColors(book.title);
		const bg = book.coverColor ?? fallback.bg;
		const ink = book.coverColor ? readableInk(book.coverColor) : fallback.ink;
		return `height:${height}px;width:${width}px;margin-left:${offset}px;background:${bg};color:${ink}`;
	}

	const piles = (items: BookListItem[]) =>
		Array.from({ length: Math.ceil(items.length / PILE) }, (_, i) =>
			items.slice(i * PILE, (i + 1) * PILE)
		);
</script>

<div class="space-y-12">
	{#each segments as segment (segment.label ?? '\u0000none')}
		<section class="space-y-5">
			{#if group !== 'none'}<GroupHeading
					field={group}
					label={segment.label}
					count={segment.count}
				/>{/if}
			<div class="flex flex-wrap items-end gap-x-14 gap-y-10">
				{#each piles(segment.items) as pile, i (i)}
					<div class="w-[360px] max-w-full">
						<ul class="flex flex-col gap-[3px]">
							{#each pile as book (book.id)}
								<li>
									<a
										href={modalHref({ book: book.id })}
										style={spine(book)}
										class="relative flex max-w-full items-center justify-between gap-3 overflow-hidden rounded-md px-5 shadow-sm ring-1 ring-black/10 transition duration-150 outline-none after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/30 after:via-transparent after:to-black/10 hover:-translate-y-0.5 hover:brightness-105 focus-visible:ring-[3px] focus-visible:ring-ring"
										title={book.title}
									>
										<!-- bands, like the ridges on a real spine -->
										<span
											class="pointer-events-none absolute inset-y-1.5 left-2 w-px bg-current opacity-25"
										></span>
										<span
											class="pointer-events-none absolute inset-y-1.5 left-3 w-px bg-current opacity-25"
										></span>
										<span class="relative z-10 truncate text-sm font-bold">{book.title}</span>
										{#if book.authors.length}
											<span class="relative z-10 shrink-0 truncate text-xs font-semibold opacity-75"
												>{book.authors[0]}</span
											>
										{/if}
									</a>
								</li>
							{/each}
						</ul>
						<!-- the shelf -->
						<div
							class="h-3 rounded-full bg-[oklch(0.76_0.07_65)] shadow-md dark:bg-[oklch(0.42_0.05_60)]"
						></div>
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>
