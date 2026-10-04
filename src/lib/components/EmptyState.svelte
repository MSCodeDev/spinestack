<script lang="ts">
	import { Plus, SearchX } from '@lucide/svelte';
	import BlobShape from './BlobShape.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { modalHref } from '#lib/modal-url.js';

	let { filtered }: { filtered: boolean } = $props();
</script>

<div class="flex flex-col items-center gap-4 py-16 text-center">
	{#if filtered}
		<span class="grid size-20 place-items-center rounded-full bg-muted text-muted-foreground"
			><SearchX size={36} /></span
		>
		<p class="font-display text-4xl leading-none font-bold">Nothing on the shelf matches</p>
		<p class="text-muted-foreground">No books match your search or filters.</p>
	{:else}
		<!-- a little leaning stack of books on a soft blob -->
		<div class="relative grid w-72 place-items-center py-6">
			<BlobShape seed={21} class="animate-drift absolute inset-0 size-full text-tile-butter" />
			<svg viewBox="0 0 160 120" class="relative w-52" aria-hidden="true">
				<path
					d="M20 98C20 88 28 84 40 85L132 86C142 87 142 106 130 108L30 109C22 109 20 104 20 98Z"
					fill="var(--primary)"
					opacity="0.92"
				/>
				<path
					d="M32 74C32 63 40 60 52 61L128 62C138 63 138 82 126 84L44 85C35 85 32 80 32 74Z"
					fill="oklch(0.78 0.1 185)"
				/>
				<path
					d="M24 50C24 40 32 37 44 38L112 39C122 40 122 58 110 60L36 61C27 61 24 56 24 50Z"
					fill="oklch(0.85 0.12 95)"
				/>
				<path
					d="M56 34C54 24 60 14 70 15C80 16 82 28 76 36C72 41 58 41 56 34Z"
					fill="oklch(0.78 0.1 300)"
					transform="rotate(-12 66 26)"
				/>
				<path
					d="M42 79q34-6 70 0M40 103q44-7 78 0M34 55q36-6 62 0"
					fill="none"
					stroke="white"
					stroke-width="2.4"
					stroke-linecap="round"
					opacity="0.6"
				/>
			</svg>
		</div>
		<p class="font-display text-5xl leading-none font-bold">Let's fill these shelves!</p>
		<p class="max-w-sm text-muted-foreground">
			Your library is empty. Add your first book by title, ISBN or by scanning its barcode.
		</p>
		<Button href={modalHref({ add: '' })} size="lg"><Plus /> Add your first book</Button>
	{/if}
</div>
