import { fail } from '@sveltejs/kit';
import {
	InvalidImageError,
	MAX_IMAGE_BYTES,
	coverStore,
	downloadImage
} from '#lib/server/covers/index.js';
import { clearBookCover, setBookCover } from '#lib/server/library/cover.js';
import { db } from '#lib/server/db/index.js';
import { requireLibrary } from '#lib/server/guard.js';
import {
	DuplicateIsbnError,
	deleteBook,
	finishReading,
	saveBook,
	startReading
} from '#lib/server/library/books.js';
import { parseBookForm } from '#lib/server/library/book-form.js';
import { queryBooks } from '#lib/server/library/list.js';
import { PAGE_SIZE, parseQuery } from '#lib/library/query.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const { libraryId } = requireLibrary(locals);
	const query = parseQuery(url.searchParams);
	return { query, page: queryBooks(db, libraryId, query, { offset: 0, limit: PAGE_SIZE }) };
};

/**
 * Best-effort poster for a new book: the provider's cover URL, else Open Library's cover for the ISBN.
 * Returns false only when a cover was expected (a URL was given) but could not be fetched.
 */
async function fetchNewCover(
	libraryId: string,
	bookId: string,
	coverUrl: string,
	isbn: string | null
) {
	const url =
		coverUrl || (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false` : '');
	if (!url) return true;
	try {
		const image = await downloadImage(url, { timeoutMs: 6_000 });
		await setBookCover(db, coverStore, libraryId, bookId, image);
		return true;
	} catch (e) {
		console.warn(`Cover download failed for ${bookId}:`, e instanceof Error ? e.message : e);
		return !coverUrl;
	}
}

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { libraryId } = requireLibrary(locals);
		const form = await request.formData();
		const parsed = parseBookForm(form);
		if (!parsed.input) return fail(400, { error: parsed.error });

		const id = String(form.get('id') ?? '') || undefined;
		try {
			const saved = saveBook(db, libraryId, parsed.input, id);
			const coverFailed = id
				? false
				: !(await fetchNewCover(
						libraryId,
						saved,
						String(form.get('coverUrl') ?? ''),
						parsed.input.isbn
					));
			return { saved, coverFailed };
		} catch (e) {
			if (e instanceof DuplicateIsbnError) {
				return fail(400, { error: e.message, duplicateId: e.bookId });
			}
			throw e;
		}
	},

	delete: async ({ request, locals }) => {
		const { libraryId } = requireLibrary(locals);
		const id = String((await request.formData()).get('id') ?? '');
		const deleted = deleteBook(db, libraryId, id);
		if (deleted) await coverStore.remove(id);
		return { deleted };
	},

	uploadCover: async ({ request, locals }) => {
		const { libraryId } = requireLibrary(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const file = form.get('cover');

		if (!(file instanceof File) || file.size === 0) return fail(400, { error: 'Choose an image.' });
		if (file.size > MAX_IMAGE_BYTES) return fail(400, { error: 'Image must be under 5 MB.' });

		try {
			const ok = await setBookCover(
				db,
				coverStore,
				libraryId,
				id,
				Buffer.from(await file.arrayBuffer())
			);
			return ok ? { cover: id } : fail(404, { error: 'Book not found.' });
		} catch (e) {
			if (e instanceof InvalidImageError) return fail(400, { error: e.message });
			throw e;
		}
	},

	removeCover: async ({ request, locals }) => {
		const { libraryId } = requireLibrary(locals);
		const id = String((await request.formData()).get('id') ?? '');
		await clearBookCover(db, coverStore, libraryId, id);
		return { cover: id };
	},

	startReading: async ({ request, locals }) => {
		const { libraryId, userId } = requireLibrary(locals);
		const id = String((await request.formData()).get('id') ?? '');
		startReading(db, libraryId, id, userId);
		return { reading: id };
	},

	finishReading: async ({ request, locals }) => {
		const { libraryId } = requireLibrary(locals);
		const id = String((await request.formData()).get('readingId') ?? '');
		finishReading(db, libraryId, id);
		return { reading: id };
	}
};
