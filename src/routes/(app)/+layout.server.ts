import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { getPreferences } from '#lib/server/preferences.js';
import { getStats } from '#lib/server/library/stats.js';
import { hasUsers } from '#lib/server/users.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	if (!locals.user || !locals.libraryId) redirect(303, (await hasUsers()) ? '/login' : '/setup');
	const prefs = getPreferences(db, locals.user.id);
	for (const key of ['theme', 'accent'] as const) {
		if (cookies.get(key) !== prefs[key]) {
			cookies.set(key, prefs[key], { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: false });
		}
	}

	return {
		prefs,
		user: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email,
			role: locals.user.role
		},
		stats: getStats(db, locals.libraryId)
	};
};
