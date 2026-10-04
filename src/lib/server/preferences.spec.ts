import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb, type Db } from './db/factory.js';
import { user } from './db/schema.js';
import { DEFAULT_PREFERENCES } from '../preferences.js';
import { getPreferences, setPreferences } from './preferences.js';

let db: Db;

beforeEach(() => {
	({ db } = createDb(':memory:'));
	migrate(db, { migrationsFolder: 'drizzle' });
	db.insert(user).values({ id: 'u1', name: 'A', email: 'a@x.co' }).run();
	db.insert(user).values({ id: 'u2', name: 'B', email: 'b@x.co' }).run();
});

describe('preferences', () => {
	it('defaults when nothing is stored', () => {
		expect(getPreferences(db, 'u1')).toEqual(DEFAULT_PREFERENCES);
	});

	it('stores a partial patch and keeps the rest', () => {
		setPreferences(db, 'u1', { currency: 'eur', pageSize: 120 });
		expect(setPreferences(db, 'u1', { theme: 'dark' })).toEqual({
			currency: 'EUR',
			defaultView: 'covers',
			pageSize: 120,
			theme: 'dark',
			avatarSeed: ''
		});
		expect(getPreferences(db, 'u1')).toMatchObject({ currency: 'EUR', theme: 'dark' });
	});

	it('ignores invalid values and is per user', () => {
		setPreferences(db, 'u1', { currency: 'EUR' });
		setPreferences(db, 'u1', { currency: 'nope', defaultView: 'grid' });
		expect(getPreferences(db, 'u1')).toMatchObject({ currency: 'EUR', defaultView: 'covers' });
		expect(getPreferences(db, 'u2')).toEqual(DEFAULT_PREFERENCES);
	});
});
