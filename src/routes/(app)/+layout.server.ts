import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { getStats } from '#lib/server/library/stats.js';
import { hasUsers } from '#lib/server/users.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.libraryId) redirect(303, (await hasUsers()) ? '/login' : '/setup');
	return {
		user: { name: locals.user.name, email: locals.user.email, role: locals.user.role },
		stats: getStats(db, locals.libraryId)
	};
};
