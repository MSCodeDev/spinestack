<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import Wordmark from '#lib/components/Wordmark.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { modalHref } from '#lib/modal-url.js';

	let { data, children } = $props();

	const initial = $derived(data.user.name.trim().charAt(0).toUpperCase() || '?');
</script>

<div class="min-h-dvh">
	<header class="relative z-20">
		<div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
			<a href={resolve('/(app)')} aria-label="SpineStack home"><Wordmark /></a>
			<div class="flex items-center gap-2 sm:gap-3">
				<Button href={modalHref({ add: '' })} size="lg" class="shadow-sm">
					<Plus /> Add book
				</Button>
				<a
					href={modalHref({ settings: 'preferences' })}
					aria-label="Settings"
					class="flex items-center gap-2 rounded-full bg-secondary p-1 transition hover:bg-secondary/70 sm:pr-4"
				>
					<span
						class="grid size-8 place-items-center blob-c bg-primary text-sm font-extrabold text-primary-foreground"
						>{initial}</span
					>
					<span class="hidden text-sm font-bold text-secondary-foreground sm:inline"
						>{data.user.name}</span
					>
				</a>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6">{@render children()}</main>
</div>
