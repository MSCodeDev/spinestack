import { deserialize } from '$app/forms';
import { actionHref } from '#lib/modal-url.js';
import type { Draft } from '#lib/types.js';

/** The same fields the add form submits, so the `save` action handles both alike. */
export function draftToFormData(draft: Draft): FormData {
	const form = new FormData();
	const text = (name: string, value: string | number | null | undefined) =>
		form.append(name, value === null || value === undefined ? '' : String(value));

	text('title', draft.title);
	text('subtitle', draft.subtitle);
	for (const author of draft.authors ?? []) form.append('author', author);
	text('isbn', draft.isbn);
	text('publisher', draft.publisher);
	text('pageCount', draft.pageCount);
	text('language', draft.language);
	text('synopsis', draft.synopsis);
	text('coverUrl', draft.coverUrl);
	text('status', draft.status ?? 'owned');
	return form;
}

/** Add a book without leaving the current modal. Throws a user-facing message on failure. */
export async function saveDraft(draft: Draft): Promise<{ id: string; coverFailed: boolean }> {
	const res = await fetch(actionHref('save'), {
		method: 'POST',
		body: draftToFormData(draft),
		headers: { 'x-sveltekit-action': 'true' }
	});
	const result = deserialize(await res.text());

	if (result.type === 'success' && typeof result.data?.saved === 'string') {
		return { id: result.data.saved, coverFailed: !!result.data.coverFailed };
	}
	if (result.type === 'failure')
		throw new Error((result.data?.error as string) ?? 'Could not add the book.');
	throw new Error('Could not add the book.');
}
