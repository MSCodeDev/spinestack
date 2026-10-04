import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { requireLibrary } from '#lib/server/guard.js';
import { getOptions } from '#lib/server/library/books.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	const { libraryId } = requireLibrary(locals);
	return json(getOptions(db, libraryId));
};
