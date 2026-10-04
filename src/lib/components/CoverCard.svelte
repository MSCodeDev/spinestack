<script lang="ts">
	import BookCover from './BookCover.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { modalHref } from '#lib/modal-url.js';
	import type { BookListItem } from '#lib/types.js';

	let { book }: { book: BookListItem } = $props();
</script>

<a
	href={modalHref({ book: book.id })}
	class="group block rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
>
	<div class="relative transition duration-200 group-hover:-translate-y-1.5 group-hover:-rotate-1">
		<BookCover
			bookId={book.id}
			title={book.title}
			author={book.authors[0]}
			coverVersion={book.coverVersion}
		/>
		{#if book.status === 'wishlist'}
			<Badge class="absolute top-2 right-2 z-20 bg-accent text-accent-foreground shadow-sm"
				>Wishlist</Badge
			>
		{/if}
	</div>
	<p class="mt-3 line-clamp-2 text-sm leading-tight font-bold">{book.title}</p>
	{#if book.authors.length}
		<p class="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{book.authors.join(', ')}</p>
	{/if}
</a>
