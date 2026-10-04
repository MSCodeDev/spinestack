import { error } from '@sveltejs/kit';

/** The signed-in user's library id, or a 401. */
export function requireLibrary(locals: App.Locals) {
	if (!locals.user || !locals.libraryId) error(401, 'Unauthorized');
	return { userId: locals.user.id, libraryId: locals.libraryId };
}
