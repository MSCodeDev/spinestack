import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { requireLibrary } from '#lib/server/guard.js';
import { getBook } from '#lib/server/library/books.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) => {
	const { libraryId } = requireLibrary(locals);
	const found = getBook(db, libraryId, params.id);
	if (!found) error(404, 'Book not found');
	return json(found);
};
