import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.js';
import { db, runMigrations } from '#lib/server/db/index.js';
import { library } from '#lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { svelteKitHandler } from 'better-auth/svelte-kit';

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

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
