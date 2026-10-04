import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb, type Db } from '../db/factory.js';
import { library, user } from '../db/schema.js';
import type { BookInput } from '../../types.js';
import { saveBook } from './books.js';
import {
	AccountRuleError,
	assertCanRemoveOrDemote,
	bookIdsOwnedBy,
	listAccounts
} from './accounts.js';

let db: Db;

beforeEach(() => {
	({ db } = createDb(':memory:'));
	migrate(db, { migrationsFolder: 'drizzle' });
	db.insert(user).values({ id: 'a1', name: 'Admin', email: 'a@x.co', role: 'admin' }).run();
	db.insert(user).values({ id: 'a2', name: 'Admin Two', email: 'a2@x.co', role: 'admin' }).run();
	db.insert(user).values({ id: 'u1', name: 'Reader', email: 'u@x.co', role: 'user' }).run();
});

describe('accounts', () => {
	it('lists users with a normalised role', () => {
		db.insert(user).values({ id: 'n', name: 'No role', email: 'n@x.co', role: null }).run();
		const rows = listAccounts(db);
		expect(rows.map((r) => [r.id, r.role]).sort()).toEqual([
			['a1', 'admin'],
			['a2', 'admin'],
			['n', 'user'],
			['u1', 'user']
		]);
	});

	it('never lets you remove or demote yourself', () => {
		expect(() => assertCanRemoveOrDemote(db, 'a1', 'a1', 'remove')).toThrow(/your own account/);
		expect(() => assertCanRemoveOrDemote(db, 'a1', 'a1', 'demote')).toThrow(/own admin role/);
	});

	it('keeps at least one administrator', () => {
		expect(() => assertCanRemoveOrDemote(db, 'a1', 'a2', 'remove')).not.toThrow();
		db.delete(user).where(eq(user.id, 'a2')).run();
		db.insert(user).values({ id: 'x', name: 'X', email: 'x@x.co', role: 'user' }).run();
		// a1 is now the only admin; someone else acting on them is blocked
		expect(() => assertCanRemoveOrDemote(db, 'x', 'a1', 'remove')).toThrow(AccountRuleError);
		expect(() => assertCanRemoveOrDemote(db, 'a1', 'missing', 'remove')).toThrow(/not found/);
	});

	it("finds the books in a user's libraries", () => {
		const lib = db.insert(library).values({ ownerId: 'u1', name: 'L' }).returning().get().id;
		const input = { title: 'T', authors: [], tags: [], status: 'owned' } as unknown as BookInput;
		const one = saveBook(db, lib, input);
		const two = saveBook(db, lib, { ...input, title: 'U' });
		expect(bookIdsOwnedBy(db, 'u1').sort()).toEqual([one, two].sort());
		expect(bookIdsOwnedBy(db, 'a1')).toEqual([]);
	});
});
