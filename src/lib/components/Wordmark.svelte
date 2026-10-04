<script lang="ts">
	import { LibraryBig } from '@lucide/svelte';
	import { cn } from '#lib/utils.js';

	let { class: className, large = false }: { class?: string; large?: boolean } = $props();
</script>

<span class={cn('inline-flex items-center gap-2.5', className)}>
	<span
		class="animate-morph grid shrink-0 -rotate-6 place-items-center bg-primary text-primary-foreground shadow-sm {large
			? 'size-12'
			: 'size-9'}"
	>
		<LibraryBig size={large ? 26 : 20} />
	</span>
	<span class="font-display leading-none font-bold {large ? 'text-5xl' : 'text-4xl'}"
		>SpineStack</span
	>
</span>
