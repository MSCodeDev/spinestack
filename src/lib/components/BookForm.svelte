<script lang="ts">
	import { actionHref, modalHref } from '#lib/modal-url.js';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import ChipInput from './ChipInput.svelte';
	import SuggestInput from './SuggestInput.svelte';
	import { toast } from '#lib/stores/toast.svelte.js';
	import { fromMinor } from '#lib/money.js';
	import type { BookDetail, Draft, Options } from '#lib/types.js';

	type Props = {
		id: string;
		book?: BookDetail | null;
		/** Prefill for a new book, e.g. from a lookup result. */
		draft?: Draft | null;
		options: Options;
		defaultCurrency?: string;
		onsaved: (bookId: string) => void | Promise<void>;
		oncancel: () => void;
	};

	let {
		id,
		book = null,
		draft = null,
		options,
		defaultCurrency = 'USD',
		onsaved,
		oncancel
	}: Props = $props();

	// The parent re-keys the form per book, so the initial value is all we need.
	const initial: Draft | null = untrack(() => book ?? draft);
	let authors = $state(initial?.authors ?? []);
	let tags = $state(initial?.tags ?? []);
	let error = $state<string | null>(null);
	let duplicateId = $state<string | null>(null);
	let busy = $state(false);

	const currency = initial?.currency ?? untrack(() => defaultCurrency);
	const price = (minor: number | null) => (minor === null ? '' : fromMinor(minor, currency));
</script>

<form
	{id}
	method="post"
	action={actionHref('save')}
	class="space-y-4"
	use:enhance={() => {
		busy = true;
		error = duplicateId = null;
		return async ({ result, update }) => {
			busy = false;
			if (result.type === 'success' && result.data?.saved) {
				if (result.data.coverFailed) toast('Saved, but the cover could not be downloaded', 'error');
				await update({ reset: false });
				await onsaved(result.data.saved as string);
			} else if (result.type === 'failure') {
				error = (result.data?.error as string) ?? 'Could not save the book.';
				duplicateId = (result.data?.duplicateId as string) ?? null;
			} else {
				await update();
			}
		};
	}}
>
	{#if book}<input type="hidden" name="id" value={book.id} />{/if}
	{#if initial?.coverUrl}<input type="hidden" name="coverUrl" value={initial.coverUrl} />{/if}

	<section class="space-y-4">
		<h3 class="font-display text-2xl leading-none font-bold">The book</h3>
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block text-sm font-semibold sm:col-span-2">
				Title
				<input name="title" required value={initial?.title ?? ''} class="input" />
			</label>
			{#if options.hasSubtitles || initial?.subtitle}
				<label class="block text-sm font-semibold sm:col-span-2">
					Subtitle
					<input name="subtitle" value={initial?.subtitle ?? ''} class="input" />
				</label>
			{:else}
				<input type="hidden" name="subtitle" value="" />
			{/if}
			<div class="text-sm font-semibold sm:col-span-2">
				Authors
				<ChipInput
					name="author"
					bind:values={authors}
					suggestions={options.authors}
					placeholder="Add author"
				/>
			</div>
			<label class="block text-sm font-semibold">
				ISBN
				<input name="isbn" inputmode="numeric" value={initial?.isbn ?? ''} class="input" />
			</label>
			<label class="block text-sm font-semibold">
				Pages
				<input
					name="pageCount"
					type="number"
					min="0"
					value={initial?.pageCount ?? ''}
					class="input"
				/>
			</label>
		</div>
	</section>

	<section class="space-y-4 soft-c bg-muted/60 p-6">
		<h3 class="font-display text-2xl leading-none font-bold">On the shelf</h3>
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block text-sm font-semibold">
				Location
				<SuggestInput
					name="location"
					suggestions={options.locations}
					value={initial?.location ?? ''}
					placeholder="e.g. Study – Shelf 2"
					class="input"
				/>
			</label>
			<label class="block text-sm font-semibold">
				Publisher
				<SuggestInput
					name="publisher"
					suggestions={options.publishers}
					value={initial?.publisher ?? ''}
					class="input"
				/>
			</label>
			<label class="block text-sm font-semibold">
				Series
				<SuggestInput
					name="series"
					suggestions={options.series}
					value={initial?.series ?? ''}
					class="input"
				/>
			</label>
			<label class="block text-sm font-semibold">
				Series number
				<input name="seriesNumber" value={initial?.seriesNumber ?? ''} class="input" />
			</label>
			<div class="text-sm font-semibold sm:col-span-2">
				Tags
				<ChipInput name="tag" bind:values={tags} suggestions={options.tags} placeholder="Add tag" />
			</div>
		</div>
	</section>

	<section class="space-y-4">
		<h3 class="font-display text-2xl leading-none font-bold">Price</h3>
		<label class="block max-w-xs text-sm font-semibold">
			Price
			<span class="relative block">
				<input
					name="paidPrice"
					inputmode="decimal"
					value={price(initial?.paidPrice ?? null)}
					class="input pr-16"
				/>
				<span
					class="pointer-events-none absolute top-1/2 right-4 mt-0.5 -translate-y-1/2 text-xs font-bold text-muted-foreground"
					>{currency}</span
				>
			</span>
		</label>
	</section>

	<section class="space-y-4">
		<h3 class="font-display text-2xl leading-none font-bold">About</h3>
		<label class="block text-sm font-semibold">
			Synopsis
			<textarea name="synopsis" rows="4" class="input">{initial?.synopsis ?? ''}</textarea>
		</label>
	</section>

	<!-- Not shown, but kept so editing a book never wipes them. -->
	<input type="hidden" name="status" value={initial?.status ?? 'owned'} />
	<input type="hidden" name="language" value={initial?.language ?? ''} />
	<input type="hidden" name="currency" value={currency} />
	<input type="hidden" name="labelPrice" value={price(initial?.labelPrice ?? null)} />
	<input type="hidden" name="boughtAt" value={initial?.boughtAt ?? ''} />
	<input type="hidden" name="arrivedAt" value={initial?.arrivedAt ?? ''} />
	<input type="hidden" name="notes" value={initial?.notes ?? ''} />

	{#if error}
		<p class="text-sm text-destructive" role="alert">
			{error}
			{#if duplicateId}
				<a href={modalHref({ add: null, book: duplicateId })} class="underline">Open it</a>
			{/if}
		</p>
	{/if}

	<div class="flex justify-end gap-2">
		<button type="button" class="btn" onclick={oncancel}>Cancel</button>
		<button class="btn btn-primary" disabled={busy}>{book ? 'Save' : 'Add book'}</button>
	</div>
</form>
