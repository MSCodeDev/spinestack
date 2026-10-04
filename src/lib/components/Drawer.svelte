<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';

	type Props = {
		open: boolean;
		title: string;
		children: Snippet;
		footer?: Snippet;
	};

	let { open = $bindable(), title, children, footer }: Props = $props();
	let dialog: HTMLDialogElement;

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	onclose={() => (open = false)}
	onclick={(e) => e.target === dialog && dialog.close()}
	aria-label={title}
	class="m-0 mr-0 ml-auto h-dvh max-h-dvh w-full max-w-md bg-white p-0 shadow-xl backdrop:bg-black/40 dark:bg-stone-900 dark:text-stone-100"
>
	{#if open}
		<div class="flex h-full flex-col">
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
			<div class="flex-1 overflow-y-auto px-5 py-4">{@render children()}</div>
			{#if footer}
				<footer
					class="flex justify-between gap-2 border-t border-stone-200 px-5 py-3 dark:border-stone-700"
				>
					{@render footer()}
				</footer>
			{/if}
		</div>
	{/if}
</dialog>
