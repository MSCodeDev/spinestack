<script lang="ts">
	import { Plus, SearchX } from '@lucide/svelte';
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
		<!-- a little leaning stack of books -->
		<svg viewBox="0 0 160 120" class="w-44" aria-hidden="true">
			<rect x="22" y="86" width="116" height="22" rx="6" fill="var(--primary)" opacity="0.9" />
			<rect x="34" y="62" width="104" height="22" rx="6" fill="oklch(0.78 0.1 185)" />
			<rect x="26" y="38" width="98" height="22" rx="6" fill="oklch(0.85 0.12 95)" />
			<rect
				x="52"
				y="14"
				width="22"
				height="22"
				rx="4"
				fill="oklch(0.78 0.1 300)"
				transform="rotate(-14 63 25)"
			/>
			<path
				d="M40 74h70M44 98h60M38 50h56"
				stroke="white"
				stroke-width="2"
				stroke-linecap="round"
				opacity="0.55"
			/>
		</svg>
		<p class="font-display text-5xl leading-none font-bold">Let's fill these shelves!</p>
		<p class="max-w-sm text-muted-foreground">
			Your library is empty. Add your first book by title, ISBN or by scanning its barcode.
		</p>
		<Button href={modalHref({ add: '' })} size="lg"><Plus /> Add your first book</Button>
	{/if}
</div>
