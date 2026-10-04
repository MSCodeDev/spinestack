<script lang="ts">
	import { modalHref } from '#lib/modal-url.js';
	import { Plus, Settings } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	let { data, children } = $props();
</script>

<div class="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
	<header
		class="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90"
	>
		<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
			<a href={resolve('/(app)')} class="text-lg font-semibold">SpineStack</a>
			<div class="flex items-center gap-4">
				<a href={modalHref({ add: '' })} class="btn btn-primary"><Plus size={16} /> Add book</a>
				<a
					href={modalHref({ settings: 'preferences' })}
					class="flex items-center gap-2 rounded p-1.5 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
					aria-label="Settings"
				>
					{data.user.name}
					<Settings size={18} />
				</a>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-7xl px-4 py-6">{@render children()}</main>
</div>
