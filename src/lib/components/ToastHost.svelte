<script lang="ts">
	import { toasts } from '$lib/stores/toast.svelte';
</script>

<div class="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2" aria-live="polite">
	{#each toasts as t (t.id)}
		<div
			class="pointer-events-auto rounded-md px-4 py-2 text-sm text-white shadow {t.kind === 'error'
				? 'bg-red-600'
				: 'bg-stone-800'}"
		>
			{t.message}
		</div>
	{/each}
</div>
