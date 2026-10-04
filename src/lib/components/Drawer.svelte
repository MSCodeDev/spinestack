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
		<Sheet.Header class="border-b px-6 py-4 pr-14">
			<Sheet.Title class="font-display text-3xl leading-none font-bold">{title}</Sheet.Title>
		</Sheet.Header>
		<div class="flex-1 overflow-y-auto px-6 py-5">{@render children()}</div>
		{#if footer}
			<Sheet.Footer class="flex-row justify-between gap-2 border-t px-6 py-4">
				{@render footer()}
			</Sheet.Footer>
		{/if}
	</Sheet.Content>
</Sheet.Root>
