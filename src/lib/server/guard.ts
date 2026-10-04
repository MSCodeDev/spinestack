import { error } from '@sveltejs/kit';

/** The signed-in user's library id, or a 401. */
export function requireLibrary(locals: App.Locals) {
	if (!locals.user || !locals.libraryId) error(401, 'Unauthorized');
	return { userId: locals.user.id, libraryId: locals.libraryId };
}

/** Like requireLibrary, but only for administrators (403 otherwise). */
export function requireAdmin(locals: App.Locals) {
	const session = requireLibrary(locals);
	if (locals.user?.role !== 'admin') error(403, 'Administrators only');
	return session;
}
