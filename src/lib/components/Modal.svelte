<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { cn } from '#lib/utils.js';

	type Props = {
		open: boolean;
		title: string;
		size?: 'sm' | 'md' | 'lg';
		/** Called when the user dismisses the modal (not when `open` is changed by the parent). */
		onclose?: () => void;
		children: Snippet;
		footer?: Snippet;
	};

	let { open = $bindable(), title, size = 'md', onclose, children, footer }: Props = $props();

	const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-2xl', lg: 'sm:max-w-5xl' };
</script>

<Dialog.Root bind:open onOpenChange={(value) => !value && onclose?.()}>
	<Dialog.Content
		aria-describedby={undefined}
		class={cn(
			'max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0',
			widths[size]
		)}
	>
		<div>
			<Dialog.Header class="px-8 pt-7 pr-16 pb-3">
				<Dialog.Title class="font-display text-4xl leading-none font-bold">{title}</Dialog.Title>
			</Dialog.Header>
			<div class="squiggle mx-7"></div>
		</div>
		<div class="overflow-y-auto px-8 py-5">{@render children()}</div>
		{#if footer}
			<div>
				<div class="squiggle mx-7"></div>
				<Dialog.Footer class="flex-row justify-end gap-2 px-8 pt-3 pb-6">
					{@render footer()}
				</Dialog.Footer>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
