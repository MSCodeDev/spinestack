<script lang="ts">
	import Modal from './Modal.svelte';
	import { confirmState } from '$lib/stores/confirm.svelte';

	let open = $derived(confirmState.current !== null);

	function answer(ok: boolean) {
		confirmState.current?.resolve(ok);
		confirmState.current = null;
	}
</script>

<Modal
	bind:open
	title="Are you sure?"
	size="sm"
	onclose={() => confirmState.current && answer(false)}
>
	<p>{confirmState.current?.message}</p>
	{#snippet footer()}
		<button
			type="button"
			onclick={() => answer(false)}
			class="rounded-md px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800">Cancel</button
		>
		<button
			type="button"
			onclick={() => answer(true)}
			class="rounded-md bg-red-600 px-3 py-1.5 text-white hover:bg-red-500"
		>
			{confirmState.current?.confirmLabel}
		</button>
	{/snippet}
</Modal>
