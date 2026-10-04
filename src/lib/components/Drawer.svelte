<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Sheet from '#lib/components/ui/sheet/index.js';

	type Props = {
		open: boolean;
		title: string;
		children: Snippet;
		footer?: Snippet;
	};

	let { open = $bindable(), title, children, footer }: Props = $props();
</script>

<Sheet.Root bind:open>
	<Sheet.Content
		side="right"
		aria-describedby={undefined}
		class="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
	>
		<Sheet.Header class="px-8 pt-7 pr-16 pb-3">
			<Sheet.Title class="font-display text-4xl leading-none font-bold">{title}</Sheet.Title>
		</Sheet.Header>
		<div class="squiggle mx-7"></div>
		<div class="flex-1 overflow-y-auto px-8 py-5">{@render children()}</div>
		{#if footer}
			<div class="squiggle mx-7"></div>
			<Sheet.Footer class="flex-row justify-between gap-2 px-8 pt-3 pb-6">
				{@render footer()}
			</Sheet.Footer>
		{/if}
	</Sheet.Content>
</Sheet.Root>
