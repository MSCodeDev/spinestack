<script lang="ts">
	import { Download, LoaderCircle, Upload } from '@lucide/svelte';
	import { confirm } from '#lib/stores/confirm.svelte.js';
	import RematchPanel from './RematchPanel.svelte';
	import { toast } from '#lib/stores/toast.svelte.js';

	// The server accepts bodies up to 8 MB unless BODY_SIZE_LIMIT is raised.
	const MAX_UPLOAD = 8 * 1024 * 1024;

	let file = $state<File | null>(null);
	let restoring = $state(false);
	let error = $state<string | null>(null);

	function pick(e: Event) {
		file = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
		error =
			file && file.size > MAX_UPLOAD
				? 'This backup is larger than the 8 MB upload limit. Raise BODY_SIZE_LIMIT on the server to restore it.'
				: null;
	}

	async function restore() {
		if (!file || error) return;
		const ok = await confirm(
			'Replace everything with this backup? All current books, users and accounts are replaced, and this cannot be undone.',
			'Restore'
		);
		if (!ok) return;

		restoring = true;
		error = null;
		try {
			const res = await fetch('/api/settings/backup', { method: 'POST', body: file });
			if (!res.ok) {
				throw new Error((await res.json().catch(() => null))?.message ?? 'Could not restore.');
			}
			const { books } = (await res.json()) as { books: number };
			toast(`Restored ${books} ${books === 1 ? 'book' : 'books'}`);
			// Accounts and sessions came from the backup, so start again from a clean page.
			setTimeout(() => location.assign('/'), 1200);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not restore.';
			restoring = false;
		}
	}
</script>

<div class="space-y-6 text-sm">
	<RematchPanel />

	<section class="space-y-3 border-t border-dashed border-border pt-5">
		<h3 class="font-display text-2xl leading-none font-bold">Export a backup</h3>
		<p class="text-muted-foreground">
			Downloads a copy of the whole database: every library, user and account. Cover images are not
			included.
		</p>
		<a
			href="/api/settings/backup"
			download
			data-sveltekit-reload
			class="btn btn-primary inline-flex"
		>
			<Download size={16} /> Download backup
		</a>
	</section>

	<section class="space-y-3 border-t border-dashed border-border pt-5">
		<h3 class="font-display text-2xl leading-none font-bold">Restore a backup</h3>
		<p class="text-muted-foreground">
			Replaces everything with the contents of a backup file. You may need to sign in again
			afterwards. Covers already on this server are kept. Export a backup first if you are not sure.
		</p>

		<div class="flex flex-wrap items-center gap-3">
			<label class="btn cursor-pointer border border-border">
				<Upload size={16} /> Choose backup file
				<input
					type="file"
					accept=".gz,.db,.sqlite,application/gzip"
					class="sr-only"
					disabled={restoring}
					onchange={pick}
				/>
			</label>
			{#if file}<span class="min-w-0 truncate text-muted-foreground">{file.name}</span>{/if}
		</div>

		{#if error}<p class="text-destructive" role="alert">{error}</p>{/if}

		<button
			type="button"
			class="btn btn-danger"
			disabled={!file || !!error || restoring}
			onclick={restore}
		>
			{#if restoring}<LoaderCircle size={16} class="animate-spin" /> Restoring…{:else}Restore from
				backup{/if}
		</button>
	</section>
</div>
