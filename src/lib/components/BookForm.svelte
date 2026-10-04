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
			<label class="block text-sm font-semibold sm:col-span-2">
				Subtitle
				<input name="subtitle" value={initial?.subtitle ?? ''} class="input" />
			</label>
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
				Status
				<select name="status" class="input" value={initial?.status ?? 'owned'}>
					<option value="owned">Owned</option>
					<option value="wishlist">Wishlist</option>
				</select>
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
			<label class="block text-sm font-semibold">
				Language
				<input name="language" value={initial?.language ?? ''} class="input" placeholder="en" />
			</label>
		</div>
	</section>

	<section class="space-y-4 rounded-3xl bg-muted/60 p-5">
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
		<h3 class="font-display text-2xl leading-none font-bold">Purchase</h3>
		<div class="grid gap-4 sm:grid-cols-3">
			<label class="block text-sm font-semibold">
				Currency
				<input name="currency" maxlength="3" value={currency} class="input uppercase" />
			</label>
			<label class="block text-sm font-semibold">
				Label price
				<input
					name="labelPrice"
					inputmode="decimal"
					value={price(initial?.labelPrice ?? null)}
					class="input"
				/>
			</label>
			<label class="block text-sm font-semibold">
				Paid price
				<input
					name="paidPrice"
					inputmode="decimal"
					value={price(initial?.paidPrice ?? null)}
					class="input"
				/>
			</label>
			<label class="block text-sm font-semibold">
				Bought
				<input name="boughtAt" type="date" value={initial?.boughtAt ?? ''} class="input" />
			</label>
			<label class="block text-sm font-semibold">
				Arrived
				<input name="arrivedAt" type="date" value={initial?.arrivedAt ?? ''} class="input" />
			</label>
		</div>
	</section>

	<section class="space-y-4">
		<h3 class="font-display text-2xl leading-none font-bold">Notes</h3>
		<label class="block text-sm font-semibold">
			Synopsis
			<textarea name="synopsis" rows="4" class="input">{initial?.synopsis ?? ''}</textarea>
		</label>
		<label class="block text-sm font-semibold">
			Notes
			<textarea name="notes" rows="3" class="input">{initial?.notes ?? ''}</textarea>
		</label>
	</section>

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
