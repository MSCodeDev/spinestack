import { redirect } from '@sveltejs/kit';
import { hasUsers } from '$lib/server/users';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.libraryId) redirect(303, (await hasUsers()) ? '/login' : '/setup');
	return { user: { name: locals.user.name, email: locals.user.email, role: locals.user.role } };
};
