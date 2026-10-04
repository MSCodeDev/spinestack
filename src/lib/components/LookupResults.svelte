<script lang="ts">
	import { enhance } from '$app/forms';
	import { actionHref, modalHref } from '#lib/modal-url.js';
	import { resultToDraft } from '#lib/library/draft.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import type { Draft, LookupResult } from '#lib/types.js';

	type Props = {
		results: LookupResult[];
		onreview: (draft: Draft) => void;
		onsaved: (bookId: string) => void | Promise<void>;
	};

	let { results, onreview, onsaved }: Props = $props();

	let busy = $state<number | null>(null);
	let error = $state<string | null>(null);

	const details = (r: LookupResult) =>
		[r.publisher, r.year, r.pageCount ? `${r.pageCount} pages` : null, r.language?.toUpperCase()]
			.filter(Boolean)
			.join(' · ');
</script>

{#if error}<p class="mb-2 text-sm text-red-600" role="alert">{error}</p>{/if}

<ul class="divide-y divide-stone-200 dark:divide-stone-800">
	{#each results as r, i (`${r.isbn ?? ''}|${r.title}|${i}`)}
		{@const draft = resultToDraft(r)}
		<li class="flex gap-3 py-3">
			<div class="h-20 w-14 shrink-0 overflow-hidden rounded bg-stone-200 dark:bg-stone-800">
				{#if r.coverUrl}
					<img
						src={r.coverUrl}
						alt=""
						loading="lazy"
						referrerpolicy="no-referrer"
						class="h-full w-full object-cover"
					/>
				{/if}
			</div>
			<div class="min-w-0 flex-1">
				<p class="font-medium">
					{r.title}{#if r.subtitle}<span class="font-normal text-stone-500">: {r.subtitle}</span
						>{/if}
				</p>
				{#if r.authors.length}<p class="text-sm">{r.authors.join(', ')}</p>{/if}
				<p class="text-xs text-stone-500">{details(r)}</p>
				{#if r.isbn}<p class="text-xs text-stone-500">ISBN {r.isbn}</p>{/if}
			</div>
			<div class="flex shrink-0 flex-col items-end gap-1.5">
				{#if r.existingId}
					<a href={modalHref({ add: null, book: r.existingId })} class="btn text-xs">In library</a>
				{:else}
					<form
						method="post"
						action={actionHref('save')}
						use:enhance={() => {
							busy = i;
							error = null;
							return async ({ result, update }) => {
								busy = null;
								if (result.type === 'success' && result.data?.saved) {
									if (result.data.coverFailed)
										toast('Added, but the cover could not be downloaded', 'error');
									await update({ reset: false });
									await onsaved(result.data.saved as string);
								} else if (result.type === 'failure') {
									error = (result.data?.error as string) ?? 'Could not add the book.';
								} else {
									await update();
								}
							};
						}}
					>
						<input type="hidden" name="title" value={draft.title} />
						<input type="hidden" name="subtitle" value={draft.subtitle ?? ''} />
						{#each draft.authors ?? [] as a (a)}<input
								type="hidden"
								name="author"
								value={a}
							/>{/each}
						<input type="hidden" name="isbn" value={draft.isbn ?? ''} />
						<input type="hidden" name="publisher" value={draft.publisher ?? ''} />
						<input type="hidden" name="pageCount" value={draft.pageCount ?? ''} />
						<input type="hidden" name="language" value={draft.language ?? ''} />
						<input type="hidden" name="synopsis" value={draft.synopsis ?? ''} />
						<input type="hidden" name="coverUrl" value={draft.coverUrl ?? ''} />
						<input type="hidden" name="status" value="owned" />
						<button class="btn btn-primary text-xs" disabled={busy !== null}>
							{busy === i ? 'Adding…' : 'Add'}
						</button>
					</form>
					<button type="button" class="btn text-xs" onclick={() => onreview(draft)}
						>Edit first</button
					>
				{/if}
			</div>
		</li>
	{/each}
</ul>
