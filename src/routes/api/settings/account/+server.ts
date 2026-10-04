import { error, json } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.js';
import { authCall } from '#lib/server/auth-errors.js';
import { requireLibrary } from '#lib/server/guard.js';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, request }) => {
	requireLibrary(locals);
	const name = String((await request.json()).name ?? '').trim();
	if (!name) error(400, 'Name is required.');

	await authCall(() => auth.api.updateUser({ body: { name }, headers: request.headers }));
	return json({ name });
};
