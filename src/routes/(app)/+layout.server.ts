import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { getPreferences } from '#lib/server/preferences.js';
import { getStats } from '#lib/server/library/stats.js';
import { hasUsers } from '#lib/server/users.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	if (!locals.user || !locals.libraryId) redirect(303, (await hasUsers()) ? '/login' : '/setup');
	const prefs = getPreferences(db, locals.user.id);
	if (cookies.get('theme') !== prefs.theme) {
		cookies.set('theme', prefs.theme, { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: false });
	}

	return {
		prefs,
		user: { name: locals.user.name, email: locals.user.email, role: locals.user.role },
		stats: getStats(db, locals.libraryId)
	};
};
