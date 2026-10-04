<script lang="ts">
	import { LogOut } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	let { data, children } = $props();
</script>

<div class="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
	<header
		class="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90"
	>
		<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
			<a href={resolve('/')} class="text-lg font-semibold">SpineStack</a>
			<form method="post" action="/logout" class="flex items-center gap-3 text-sm">
				<span class="text-stone-500">{data.user.name}</span>
				<button
					aria-label="Sign out"
					class="rounded p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800"
				>
					<LogOut size={18} />
				</button>
			</form>
		</div>
	</header>
	<main class="mx-auto max-w-7xl px-4 py-6">{@render children()}</main>
</div>
