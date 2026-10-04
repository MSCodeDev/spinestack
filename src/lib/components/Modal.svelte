<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';

	type Props = {
		open: boolean;
		title: string;
		size?: 'sm' | 'md' | 'lg';
		onclose?: () => void;
		children: Snippet;
		footer?: Snippet;
	};

	let { open = $bindable(), title, size = 'md', onclose, children, footer }: Props = $props();
	let dialog: HTMLDialogElement;

	const widths = { sm: 'max-w-sm', md: 'max-w-2xl', lg: 'max-w-5xl' };

	// Closing because `open` turned false must not fire `onclose`, or it can undo a navigation
	// that just opened another modal.
	let closingFromProp = false;

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) {
			closingFromProp = true;
			dialog.close();
		}
	});

	function handleClose() {
		if (closingFromProp) {
			closingFromProp = false;
			return;
		}
		open = false;
		onclose?.();
	}

	function backdropClick(e: MouseEvent) {
		if (e.target === dialog) dialog.close();
	}
</script>

<dialog
	bind:this={dialog}
	onclose={handleClose}
	onclick={backdropClick}
	aria-label={title}
	class="m-auto max-h-[90dvh] w-[calc(100%-2rem)] {widths[
		size
	]} rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/50 dark:bg-stone-900 dark:text-stone-100"
>
	{#if open}
		<div class="flex max-h-[90dvh] flex-col">
			<header
				class="flex items-center justify-between border-b border-stone-200 px-5 py-3 dark:border-stone-700"
			>
				<h2 class="text-lg font-semibold">{title}</h2>
				<button
					type="button"
					onclick={() => dialog.close()}
					aria-label="Close"
					class="rounded p-1 hover:bg-stone-100 dark:hover:bg-stone-800"
				>
					<X size={18} />
				</button>
			</header>
			<div class="overflow-y-auto px-5 py-4">{@render children()}</div>
			{#if footer}
				<footer
					class="flex justify-end gap-2 border-t border-stone-200 px-5 py-3 dark:border-stone-700"
				>
					{@render footer()}
				</footer>
			{/if}
		</div>
	{/if}
</dialog>
