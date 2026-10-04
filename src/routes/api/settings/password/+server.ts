import { error, json } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.js';
import { authCall } from '#lib/server/auth-errors.js';
import { requireLibrary } from '#lib/server/guard.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	requireLibrary(locals);
	const body = await request.json();
	const currentPassword = String(body.currentPassword ?? '');
	const newPassword = String(body.newPassword ?? '');
	if (newPassword.length < 8) error(400, 'The new password must be at least 8 characters.');

	await authCall(() =>
		auth.api.changePassword({
			body: { currentPassword, newPassword, revokeOtherSessions: true },
			headers: request.headers
		})
	);
	return json({ ok: true });
};
