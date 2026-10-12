<script lang="ts">
	import { actionHref } from '#lib/modal-url.js';
	import { enhance } from '$app/forms';
	import { ImagePlus, Search, Trash2 } from '@lucide/svelte';
	import BookCover from './BookCover.svelte';
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
</script>

<div class="w-40 shrink-0 space-y-2 self-center sm:self-start">
	<BookCover {bookId} {title} {author} {coverVersion} size="512" lazy={false} />

	<button
		type="button"
		class="btn w-full justify-center border border-border"
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
			class="btn w-full justify-center border border-border"
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
			<button class="btn w-full justify-center text-destructive"><Trash2 size={16} /> Remove</button
			>
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
