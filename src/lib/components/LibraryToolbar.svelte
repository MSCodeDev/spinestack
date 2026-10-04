<script lang="ts">
	import { Search } from '@lucide/svelte';

	let { q, onsearch }: { q: string; onsearch: (q: string) => void } = $props();

	// Follows the URL, but can be typed over until the next navigation.
	let value = $derived(q);
	let timer: ReturnType<typeof setTimeout>;

	function input() {
		clearTimeout(timer);
		timer = setTimeout(() => onsearch(value.trim()), 300);
	}
</script>

<div class="flex items-center gap-2">
	<label class="relative flex-1">
		<span class="sr-only">Search books</span>
		<Search size={16} class="absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
		<input
			type="search"
			bind:value
			oninput={input}
			placeholder="Search title, author, ISBN…"
			class="input mt-0 pl-9"
		/>
	</label>
</div>
