import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { requireLibrary } from '#lib/server/guard.js';
import { queryBooks } from '#lib/server/library/list.js';
import { parseQuery } from '#lib/library/query.js';
import { getPreferences } from '#lib/server/preferences.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, url }) => {
	const { libraryId, userId } = requireLibrary(locals);
	const prefs = getPreferences(db, userId);
	const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
	const query = parseQuery(url.searchParams, { view: prefs.defaultView });
	return json(
		queryBooks(db, libraryId, query, {
			offset,
			limit: query.group === 'none' ? prefs.pageSize : null
		})
	);
};
