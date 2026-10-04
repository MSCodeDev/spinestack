<script lang="ts">
	import { actionHref } from '#lib/modal-url.js';
	import { enhance } from '$app/forms';
	import { ImagePlus, Search, Trash2 } from '@lucide/svelte';
	import CoverSearchModal from './CoverSearchModal.svelte';
	import { toast } from '#lib/stores/toast.svelte.js';

	type Props = {
		bookId: string;
		title: string;
		author?: string | null;
		isbn?: string | null;
		coverVersion: number;
		onchanged: () => void | Promise<void>;
	};

	let { bookId, title, author = null, isbn = null, coverVersion, onchanged }: Props = $props();

	let searching = $state(false);

	let form = $state<HTMLFormElement>();
	let input = $state<HTMLInputElement>();
	let busy = $state(false);

	const hue = $derived([...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0));
</script>

<div class="w-36 shrink-0 space-y-2">
	<div class="aspect-[2/3] overflow-hidden rounded-md shadow ring-1 ring-black/10">
		{#if coverVersion > 0}
			<img
				src="/covers/{bookId}/512?v={coverVersion}"
				alt="Cover of {title}"
				class="h-full w-full object-cover"
			/>
		{:else}
			<div
				class="flex h-full w-full items-center justify-center p-3 text-center text-sm font-medium text-white"
				style="background: hsl({hue} 35% 38%)"
			>
				{title}
			</div>
		{/if}
	</div>

	<button
		type="button"
		class="btn w-full justify-center border border-stone-300 dark:border-stone-700"
		onclick={() => (searching = true)}
	>
		<Search size={16} /> Find cover
	</button>

	<form
		bind:this={form}
		method="post"
		action={actionHref('uploadCover')}
		enctype="multipart/form-data"
		use:enhance={() => {
			busy = true;
			return async ({ result, update }) => {
				busy = false;
				if (result.type === 'failure')
					toast((result.data?.error as string) ?? 'Upload failed', 'error');
				else if (result.type === 'success') {
					await update({ reset: false });
					await onchanged();
					toast('Cover updated');
				}
				if (input) input.value = '';
			};
		}}
	>
		<input type="hidden" name="id" value={bookId} />
		<input
			bind:this={input}
			type="file"
			name="cover"
			accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
			class="sr-only"
			aria-label="Upload cover"
			onchange={() => form?.requestSubmit()}
		/>
		<button
			type="button"
			class="btn w-full justify-center border border-stone-300 dark:border-stone-700"
			disabled={busy}
			onclick={() => input?.click()}
		>
			<ImagePlus size={16} />
			{busy ? 'Uploading…' : 'Upload'}
		</button>
	</form>

	{#if coverVersion > 0}
		<form
			method="post"
			action={actionHref('removeCover')}
			use:enhance={() =>
				async ({ update }) => {
					await update({ reset: false });
					await onchanged();
				}}
		>
			<input type="hidden" name="id" value={bookId} />
			<button class="btn w-full justify-center text-red-600"><Trash2 size={16} /> Remove</button>
		</form>
	{/if}
</div>

<CoverSearchModal
	open={searching}
	{bookId}
	query={[title, author].filter(Boolean).join(' ')}
	{isbn}
	onclose={() => (searching = false)}
	onpicked={async () => {
		searching = false;
		await onchanged();
	}}
/>
