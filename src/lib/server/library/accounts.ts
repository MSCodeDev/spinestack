import { and, asc, count, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/factory.js';
import { book, library, user } from '../db/schema.js';

export type AccountRow = {
	id: string;
	name: string;
	email: string;
	role: 'admin' | 'user';
	createdAt: number;
};

export class AccountRuleError extends Error {}

export function listAccounts(db: Db): AccountRow[] {
	return db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			createdAt: user.createdAt
		})
		.from(user)
		.orderBy(asc(user.createdAt), asc(user.id))
		.all()
		.map((u) => ({
			id: u.id,
			name: u.name,
			email: u.email,
			role: u.role === 'admin' ? 'admin' : 'user',
			createdAt: u.createdAt.getTime()
		}));
}

const adminCount = (db: Db) =>
	db.select({ n: count() }).from(user).where(eq(user.role, 'admin')).get()!.n;

/** Throws when removing or demoting `targetId` would lock the instance out or hurt the actor. */
export function assertCanRemoveOrDemote(
	db: Db,
	actorId: string,
	targetId: string,
	what: 'remove' | 'demote'
) {
	const target = db.select({ role: user.role }).from(user).where(eq(user.id, targetId)).get();
	if (!target) throw new AccountRuleError('User not found.');
	if (actorId === targetId) {
		throw new AccountRuleError(
			what === 'remove'
				? 'You cannot delete your own account.'
				: 'You cannot remove your own admin role.'
		);
	}
	if (target.role === 'admin' && adminCount(db) <= 1) {
		throw new AccountRuleError('There must be at least one administrator.');
	}
}

/** Ids of every book in the libraries a user owns, e.g. to clean up cover files before deleting them. */
export function bookIdsOwnedBy(db: Db, userId: string): string[] {
	const libraries = db
		.select({ id: library.id })
		.from(library)
		.where(eq(library.ownerId, userId))
		.all();
	if (!libraries.length) return [];
	return db
		.select({ id: book.id })
		.from(book)
		.where(
			inArray(
				book.libraryId,
				libraries.map((l) => l.id)
			)
		)
		.all()
		.map((b) => b.id);
}

export const isAdminId = (db: Db, id: string) =>
	!!db
		.select({ id: user.id })
		.from(user)
		.where(and(eq(user.id, id), eq(user.role, 'admin')))
		.get();
