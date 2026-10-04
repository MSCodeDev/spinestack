<script lang="ts">
	import { goto, refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import AddBookModal from '#lib/components/AddBookModal.svelte';
	import BookModal from '#lib/components/BookModal.svelte';
	import { withParams } from '#lib/modal-url.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import type { Options } from '#lib/types.js';

	let { data } = $props();

	const bookId = $derived(page.url.searchParams.get('book'));
	const editing = $derived(page.url.searchParams.has('edit'));
	const adding = $derived(page.url.searchParams.has('add'));

	let options = $state<Options>({
		authors: [],
		publishers: [],
		series: [],
		locations: [],
		tags: []
	});

	async function loadOptions() {
		options = await (await fetch('/api/options')).json();
	}

	$effect(() => {
		if (bookId || adding) loadOptions();
	});

	const go = (changes: Record<string, string | null>) =>
		goto(resolve('/(app)') + withParams(page.url, changes), { replace: true, reset: false });

	const closeAll = () => go({ book: null, edit: null, add: null });

	async function saved(id: string) {
		await refreshAll();
		toast('Book saved');
		await go({ add: null, edit: null, book: id });
	}
</script>

<ul class="space-y-1">
	{#each data.books as b (b.id)}
		<li><a href="{resolve('/(app)')}?book={b.id}" class="hover:underline">{b.title}</a></li>
	{:else}
		<li class="text-stone-500">No books yet.</li>
	{/each}
</ul>

<AddBookModal open={adding} {options} onclose={closeAll} onsaved={saved} />
<BookModal
	{bookId}
	edit={editing}
	{options}
	onclose={closeAll}
	onedit={(edit) => go({ edit: edit ? '' : null })}
	onsaved={saved}
/>
