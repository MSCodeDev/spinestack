import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.js';
import { db, runMigrations } from '#lib/server/db/index.js';
import { library } from '#lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { ACCENTS, THEMES, type Accent, type Theme } from '#lib/preferences.js';

export const init: ServerInit = () => {
	if (!building) runMigrations();
};

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
		const lib = await db.query.library.findFirst({ where: eq(library.ownerId, session.user.id) });
		event.locals.libraryId = lib?.id;
	}

	// The theme and colour cookies let the server render the right look without a flash.
	const cookie = event.cookies.get('theme');
	const theme: Theme = THEMES.includes(cookie as Theme) ? (cookie as Theme) : 'system';
	const accentCookie = event.cookies.get('accent');
	const accent: Accent = ACCENTS.includes(accentCookie as Accent)
		? (accentCookie as Accent)
		: 'coral';

	return svelteKitHandler({
		event,
		resolve: (e) =>
			resolve(e, {
				transformPageChunk: ({ html }) =>
					html
						.replace('%theme%', theme)
						.replace('%accent%', accent)
						.replace('%themeclass%', theme === 'dark' ? 'dark' : '')
			}),
		auth,
		building
	});
};

export const handle: Handle = handleBetterAuth;
