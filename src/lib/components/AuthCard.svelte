<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, subtitle, children }: { title: string; subtitle?: string; children: Snippet } =
		$props();
</script>

<main class="flex min-h-screen items-center justify-center bg-muted p-4">
	<div class="w-full max-w-sm rounded-xl bg-card p-6 shadow-sm">
		<h1 class="text-xl font-semibold">{title}</h1>
		{#if subtitle}<p class="mt-1 mb-4 text-sm text-muted-foreground">{subtitle}</p>{:else}<div
				class="mb-4"
			></div>{/if}
		{@render children()}
	</div>
</main>
