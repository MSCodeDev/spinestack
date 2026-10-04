import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { book } from '#lib/server/db/schema.js';
import { requireLibrary } from '#lib/server/guard.js';
import {
	DuplicateIsbnError,
	deleteBook,
	finishReading,
	saveBook,
	startReading
} from '#lib/server/library/books.js';
import { parseBookForm } from '#lib/server/library/book-form.js';
import type { Actions, PageServerLoad } from './$types';

// Interim list; replaced by the full library query.
export const load: PageServerLoad = ({ locals }) => {
	const { libraryId } = requireLibrary(locals);
	return {
		books: db
			.select({ id: book.id, title: book.title })
			.from(book)
			.where(eq(book.libraryId, libraryId))
			.orderBy(desc(book.createdAt))
			.limit(60)
			.all()
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { libraryId } = requireLibrary(locals);
		const form = await request.formData();
		const parsed = parseBookForm(form);
		if (!parsed.input) return fail(400, { error: parsed.error });

		const id = String(form.get('id') ?? '') || undefined;
		try {
			return { saved: saveBook(db, libraryId, parsed.input, id) };
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
		return { deleted: deleteBook(db, libraryId, id) };
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
