<script lang="ts">
	import { blobatarUri } from 'blobatar/uri';
	import { cn } from '#lib/utils.js';

	let { seed, class: className }: { seed: string; class?: string } = $props();

	// The same seed always draws the same face.
	const src = $derived(blobatarUri(seed, { background: 'circle' }));
</script>

<img {src} alt="" class={cn('rounded-full bg-card', className)} />
