import { error, json } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.js';
import { authCall } from '#lib/server/auth-errors.js';
import { coverStore } from '#lib/server/covers/index.js';
import { db } from '#lib/server/db/index.js';
import { requireAdmin } from '#lib/server/guard.js';
import {
	AccountRuleError,
	assertCanRemoveOrDemote,
	bookIdsOwnedBy,
	listAccounts
} from '#lib/server/library/accounts.js';
import type { RequestHandler } from './$types';

const MIN_PASSWORD = 8;
const ROLES = ['admin', 'user'] as const;
type Role = (typeof ROLES)[number];

const roleOf = (value: unknown): Role => (ROLES.includes(value as Role) ? (value as Role) : 'user');

function rule<T>(fn: () => T): T {
	try {
		return fn();
	} catch (e) {
		if (e instanceof AccountRuleError) error(400, e.message);
		throw e;
	}
}

export const GET: RequestHandler = ({ locals }) => {
	requireAdmin(locals);
	return json({ users: listAccounts(db) });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	requireAdmin(locals);
	const body = await request.json();
	const name = String(body.name ?? '').trim();
	const email = String(body.email ?? '').trim();
	const password = String(body.password ?? '');

	if (!name || !email) error(400, 'Name and email are required.');
	if (password.length < MIN_PASSWORD)
		error(400, `Password must be at least ${MIN_PASSWORD} characters.`);

	await authCall(() =>
		auth.api.createUser({
			body: { name, email, password, role: roleOf(body.role) },
			headers: request.headers
		})
	);
	return json({ users: listAccounts(db) }, { status: 201 });
};

/** Change a user's role or reset their password. */
export const PATCH: RequestHandler = async ({ locals, request }) => {
	const { userId } = requireAdmin(locals);
	const body = await request.json();
	const id = String(body.id ?? '');

	if (body.password !== undefined) {
		const password = String(body.password);
		if (password.length < MIN_PASSWORD)
			error(400, `Password must be at least ${MIN_PASSWORD} characters.`);
		await authCall(() =>
			auth.api.setUserPassword({
				body: { userId: id, newPassword: password },
				headers: request.headers
			})
		);
	}

	if (body.role !== undefined) {
		const role = roleOf(body.role);
		if (role === 'user') rule(() => assertCanRemoveOrDemote(db, userId, id, 'demote'));
		await authCall(() =>
			auth.api.setRole({ body: { userId: id, role }, headers: request.headers })
		);
	}

	return json({ users: listAccounts(db) });
};

export const DELETE: RequestHandler = async ({ locals, request, url }) => {
	const { userId } = requireAdmin(locals);
	const id = url.searchParams.get('id') ?? '';

	rule(() => assertCanRemoveOrDemote(db, userId, id, 'remove'));

	// Their libraries and books are deleted with the account; clear the cover files too.
	const bookIds = bookIdsOwnedBy(db, id);
	await authCall(() => auth.api.removeUser({ body: { userId: id }, headers: request.headers }));
	await Promise.all(bookIds.map((bookId) => coverStore.remove(bookId)));

	return json({ users: listAccounts(db) });
};
