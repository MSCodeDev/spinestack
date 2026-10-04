<script lang="ts">
	import { blobPath } from '#lib/blob.js';
	import { cn } from '#lib/utils.js';

	type Props = { seed: number; class?: string; wobble?: number };

	let { seed, class: className, wobble = 0.28 }: Props = $props();

	const d = $derived(blobPath(seed, { wobble }));
</script>

<svg viewBox="0 0 200 200" class={cn('fill-current', className)} aria-hidden="true">
	<path {d} />
</svg>
