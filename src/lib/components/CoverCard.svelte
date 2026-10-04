<script lang="ts">
	import { modalHref } from '#lib/modal-url.js';
	import type { BookListItem } from '#lib/types.js';

	let { book }: { book: BookListItem } = $props();

	const hue = $derived([...book.title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0));
</script>

<a href={modalHref({ book: book.id })} class="group block">
	<div
		class="relative aspect-[2/3] overflow-hidden rounded-md shadow-sm ring-1 ring-black/10 transition group-hover:shadow-md"
	>
		{#if book.coverVersion > 0}
			<img
				src="/covers/{book.id}/256?v={book.coverVersion}"
				alt=""
				loading="lazy"
				class="h-full w-full object-cover"
			/>
		{:else}
			<div
				class="flex h-full w-full items-center justify-center p-3 text-center text-sm font-medium text-white"
				style="background: hsl({hue} 35% 38%)"
			>
				{book.title}
			</div>
		{/if}
		{#if book.status === 'wishlist'}
			<span
				class="absolute top-1.5 left-1.5 rounded bg-accent-foreground px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase"
				>Wishlist</span
			>
		{/if}
	</div>
	<p class="mt-1.5 line-clamp-2 text-sm leading-tight font-medium">{book.title}</p>
	{#if book.authors.length}
		<p class="line-clamp-1 text-xs text-muted-foreground">{book.authors.join(', ')}</p>
	{/if}
</a>
