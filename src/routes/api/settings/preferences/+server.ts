import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { requireLibrary } from '#lib/server/guard.js';
import { getPreferences, setPreferences } from '#lib/server/preferences.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	const { userId } = requireLibrary(locals);
	return json(getPreferences(db, userId));
};

export const PUT: RequestHandler = async ({ locals, request, cookies }) => {
	const { userId } = requireLibrary(locals);
	const prefs = setPreferences(db, userId, await request.json());
	for (const key of ['theme', 'accent'] as const) {
		cookies.set(key, prefs[key], { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: false });
	}
	return json(prefs);
};
