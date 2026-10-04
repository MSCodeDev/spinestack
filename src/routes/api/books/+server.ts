import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { requireLibrary } from '#lib/server/guard.js';
import { queryBooks } from '#lib/server/library/list.js';
import { PAGE_SIZE, parseQuery } from '#lib/library/query.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, url }) => {
	const { libraryId } = requireLibrary(locals);
	const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
	return json(
		queryBooks(db, libraryId, parseQuery(url.searchParams), { offset, limit: PAGE_SIZE })
	);
};
