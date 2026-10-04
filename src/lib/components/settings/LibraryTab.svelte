<script lang="ts">
	import { untrack } from 'svelte';
	import { refreshAll } from '$app/navigation';
	import { Check, Pencil, Trash2, X } from '@lucide/svelte';
	import { api } from '#lib/client/api.js';
	import { confirm } from '#lib/stores/confirm.svelte.js';
	import { toast } from '#lib/stores/toast.svelte.js';

	type Kind = 'author' | 'publisher' | 'series' | 'location' | 'tag';
	type Row = { id: string; name: string; count: number };

	const kinds: { id: Kind; label: string; plural: string }[] = [
		{ id: 'location', label: 'Location', plural: 'Locations' },
		{ id: 'tag', label: 'Tag', plural: 'Tags' },
		{ id: 'author', label: 'Author', plural: 'Authors' },
		{ id: 'publisher', label: 'Publisher', plural: 'Publishers' },
		{ id: 'series', label: 'Series', plural: 'Series' }
	];

	let kind = $state<Kind>('location');
	let rows = $state<Row[] | null>(null);
	let error = $state<string | null>(null);
	let editing = $state<string | null>(null);
	let draft = $state('');

	const current = $derived(kinds.find((k) => k.id === kind)!);
	const unused = $derived(rows?.filter((r) => r.count === 0).length ?? 0);

	async function load(k: Kind = kind) {
		error = null;
		try {
			rows = (await api<{ entities: Row[] }>(`/api/settings/entities?kind=${k}`)).entities;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load.';
		}
	}

	// Reload whenever the kind changes.
	$effect(() => {
		const k = kind;
		untrack(() => {
			rows = null;
			editing = null;
		});
		load(k);
	});

	async function changed() {
		await load();
		await refreshAll();
	}

	function startEdit(row: Row) {
		editing = row.id;
		draft = row.name;
	}

	async function saveEdit(row: Row) {
		const name = draft.trim();
		if (!name || name === row.name) {
			editing = null;
			return;
		}
		const existing = rows?.find(
			(r) => r.id !== row.id && r.name.toLowerCase() === name.toLowerCase()
		);
		if (
			existing &&
			!(await confirm(`“${existing.name}” already exists. Merge “${row.name}” into it?`, 'Merge'))
		)
			return;

		try {
			const { merged } = await api<{ merged: boolean }>('/api/settings/entities', 'PATCH', {
				kind,
				id: row.id,
				name
			});
			editing = null;
			toast(merged ? 'Merged' : 'Renamed');
			await changed();
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Could not rename', 'error');
		}
	}

	async function remove(row: Row) {
		const used = row.count
			? ` It is used by ${row.count} ${row.count === 1 ? 'book' : 'books'}, which will lose it.`
			: '';
		if (!(await confirm(`Delete “${row.name}”?${used}`))) return;
		try {
			await api(`/api/settings/entities?kind=${kind}&id=${row.id}`, 'DELETE');
			toast('Deleted');
			await changed();
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Could not delete', 'error');
		}
	}

	async function removeUnused() {
		if (!(await confirm(`Delete ${unused} unused ${current.plural.toLowerCase()}?`))) return;
		try {
			await api(`/api/settings/entities?kind=${kind}&unused=1`, 'DELETE');
			toast('Removed unused');
			await changed();
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Could not delete', 'error');
		}
	}
</script>

<div class="space-y-4 text-sm">
	<div class="flex flex-wrap gap-1" role="group" aria-label="Kind">
		{#each kinds as k (k.id)}
			<button
				type="button"
				aria-pressed={kind === k.id}
				class="rounded-full px-3 py-1 {kind === k.id
					? 'bg-primary text-primary-foreground'
					: 'bg-muted hover:bg-muted  '}"
				onclick={() => (kind = k.id)}
			>
				{k.plural}
			</button>
		{/each}
	</div>

	{#if error}
		<p class="text-destructive" role="alert">{error}</p>
	{:else if !rows}
		<p class="text-muted-foreground">Loading…</p>
	{:else if !rows.length}
		<p class="text-muted-foreground">
			No {current.plural.toLowerCase()} yet. They are created as you add books.
		</p>
	{:else}
		<ul class="divide-y divide-border rounded-md border border-border">
			{#each rows as row (row.id)}
				<li class="flex items-center gap-2 px-3 py-2">
					{#if editing === row.id}
						<form
							class="flex flex-1 items-center gap-1"
							onsubmit={(e) => {
								e.preventDefault();
								saveEdit(row);
							}}
						>
							<input class="input mt-0 flex-1" bind:value={draft} aria-label="New name" />
							<button class="rounded p-1.5 hover:bg-muted" aria-label="Save"
								><Check size={16} /></button
							>
							<button
								type="button"
								class="rounded p-1.5 hover:bg-muted"
								aria-label="Cancel"
								onclick={() => (editing = null)}><X size={16} /></button
							>
						</form>
					{:else}
						<span class="flex-1 truncate">{row.name}</span>
						<span class="text-xs text-muted-foreground"
							>{row.count} {row.count === 1 ? 'book' : 'books'}</span
						>
						<button
							type="button"
							class="rounded p-1.5 hover:bg-muted"
							aria-label="Rename {row.name}"
							onclick={() => startEdit(row)}><Pencil size={16} /></button
						>
						<button
							type="button"
							class="rounded p-1.5 text-destructive hover:bg-muted"
							aria-label="Delete {row.name}"
							onclick={() => remove(row)}><Trash2 size={16} /></button
						>
					{/if}
				</li>
			{/each}
		</ul>
		{#if unused}
			<button type="button" class="btn" onclick={removeUnused}>Delete {unused} unused</button>
		{/if}
		<p class="text-xs text-muted-foreground">Renaming to an existing name merges the two.</p>
	{/if}
</div>
