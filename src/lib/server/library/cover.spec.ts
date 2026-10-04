import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createCoverStore } from '../covers/store.js';
import { createDb, type Db } from '../db/factory.js';
import { library, user } from '../db/schema.js';
import { saveBook, getBook } from './books.js';
import { clearBookCover, setBookCover, setBookCoverFromUrl } from './cover.js';
import type { BookInput } from '../../types.js';

let db: Db;
let lib: string;
let dir: string;
let bookId: string;

const input = { title: 'Dune', authors: [], tags: [], status: 'owned' } as unknown as BookInput;
const png = () =>
	sharp({ create: { width: 300, height: 450, channels: 3, background: '#2040c0' } })
		.png()
		.toBuffer();

beforeEach(() => {
	({ db } = createDb(':memory:'));
	migrate(db, { migrationsFolder: 'drizzle' });
	db.insert(user).values({ id: 'u1', name: 'U', email: 'u@x.co' }).run();
	lib = db.insert(library).values({ ownerId: 'u1', name: 'L' }).returning().get().id;
	bookId = saveBook(db, lib, input);
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cover-svc-'));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('book covers', () => {
	it('sets a cover, bumping the version each time', async () => {
		const store = createCoverStore(dir);
		expect(await setBookCover(db, store, lib, bookId, await png())).toBe(true);
		expect(getBook(db, lib, bookId)!.coverVersion).toBe(1);
		await setBookCover(db, store, lib, bookId, await png());
		expect(getBook(db, lib, bookId)!.coverVersion).toBe(2);
		expect(await store.read(bookId, '256')).not.toBeNull();
	});

	it('refuses books from another library without writing files', async () => {
		const store = createCoverStore(dir);
		expect(await setBookCover(db, store, 'other', bookId, await png())).toBe(false);
		expect(await store.read(bookId, 'full')).toBeNull();
	});

	it('clears a cover and its files', async () => {
		const store = createCoverStore(dir);
		await setBookCover(db, store, lib, bookId, await png());
		expect(await clearBookCover(db, store, lib, bookId)).toBe(true);
		expect(getBook(db, lib, bookId)!.coverVersion).toBe(0);
		expect(await store.read(bookId, 'full')).toBeNull();
	});

	it('sets a cover from a downloaded URL, and not for other libraries', async () => {
		const store = createCoverStore(dir);
		const image = await png();
		const seen: string[] = [];
		const download = async (url: string) => (seen.push(url), image);

		expect(
			await setBookCoverFromUrl(
				db,
				store,
				lib,
				bookId,
				'https://covers.openlibrary.org/x.jpg',
				download
			)
		).toBe(true);
		expect(getBook(db, lib, bookId)!.coverVersion).toBe(1);
		expect(seen).toEqual(['https://covers.openlibrary.org/x.jpg']);

		expect(
			await setBookCoverFromUrl(
				db,
				store,
				'other',
				bookId,
				'https://covers.openlibrary.org/x.jpg',
				download
			)
		).toBe(false);
		expect(seen).toHaveLength(1);
	});

	it('rejects disallowed hosts before any network use', async () => {
		const store = createCoverStore(dir);
		await expect(
			setBookCoverFromUrl(db, store, lib, bookId, 'https://evil.example/x.jpg')
		).rejects.toThrow(/not allowed/);
		expect(getBook(db, lib, bookId)!.coverVersion).toBe(0);
	});
});
