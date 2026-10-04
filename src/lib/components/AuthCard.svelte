<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, subtitle, children }: { title: string; subtitle?: string; children: Snippet } =
		$props();
</script>

<main class="flex min-h-screen items-center justify-center bg-stone-100 p-4 dark:bg-stone-950">
	<div class="w-full max-w-sm rounded-xl bg-white p-6 shadow dark:bg-stone-900">
		<h1 class="text-xl font-semibold">{title}</h1>
		{#if subtitle}<p class="mt-1 mb-4 text-sm text-stone-500">{subtitle}</p>{:else}<div
				class="mb-4"
			></div>{/if}
		{@render children()}
	</div>
</main>
