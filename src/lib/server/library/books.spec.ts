import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sql } from 'drizzle-orm';
import { createDb, type Db } from '../db/factory.js';
import { library, user } from '../db/schema.js';
import type { BookInput } from '../../types.js';
import {
	DuplicateIsbnError,
	deleteBook,
	finishReading,
	getBook,
	getOptions,
	saveBook,
	startReading
} from './books.js';

const base: BookInput = {
	title: 'Dune',
	subtitle: null,
	authors: ['Frank Herbert'],
	isbn: '9780441172719',
	publisher: 'Ace',
	series: 'Dune Chronicles',
	seriesNumber: '1',
	location: 'Study – Shelf 2',
	tags: ['scifi', 'classic'],
	status: 'owned',
	pageCount: 412,
	language: 'en',
	synopsis: null,
	notes: 'Signed copy',
	currency: 'USD',
	labelPrice: 999,
	paidPrice: 750,
	boughtAt: '2024-01-02',
	arrivedAt: null
};

let db: Db;
let libraryId: string;

beforeEach(() => {
	({ db } = createDb(':memory:'));
	migrate(db, { migrationsFolder: 'drizzle' });
	db.insert(user).values({ id: 'u1', name: 'U', email: 'u@x.co' }).run();
	libraryId = db.insert(library).values({ ownerId: 'u1', name: 'Library' }).returning().get().id;
});

const ftsHits = (q: string) =>
	db.all<{ book_id: string }>(sql`select book_id from book_fts where book_fts match ${q}`);

describe('books service', () => {
	it('saves and reads a book with relations', () => {
		const id = saveBook(db, libraryId, base);
		const b = getBook(db, libraryId, id)!;
		expect(b).toMatchObject({
			title: 'Dune',
			authors: ['Frank Herbert'],
			publisher: 'Ace',
			series: 'Dune Chronicles',
			location: 'Study – Shelf 2',
			tags: ['classic', 'scifi'],
			paidPrice: 750
		});
	});

	it('reuses named entities case-insensitively', () => {
		saveBook(db, libraryId, base);
		saveBook(db, libraryId, { ...base, title: 'Messiah', isbn: null, authors: ['frank herbert'] });
		expect(getOptions(db, libraryId).authors).toEqual(['Frank Herbert']);
	});

	it('rejects a duplicate ISBN but allows updating the same book', () => {
		const id = saveBook(db, libraryId, base);
		expect(() => saveBook(db, libraryId, { ...base, title: 'Other' })).toThrow(DuplicateIsbnError);
		expect(() => saveBook(db, libraryId, { ...base, title: 'Dune 2' }, id)).not.toThrow();
		expect(getBook(db, libraryId, id)!.title).toBe('Dune 2');
	});

	it('keeps the search index in sync', () => {
		const id = saveBook(db, libraryId, base);
		expect(ftsHits('herbert*')).toHaveLength(1);
		expect(ftsHits('scifi')).toHaveLength(1);

		saveBook(db, libraryId, { ...base, authors: ['Brian Herbert'], tags: [] }, id);
		expect(ftsHits('frank')).toHaveLength(0);
		expect(ftsHits('brian')).toHaveLength(1);

		deleteBook(db, libraryId, id);
		expect(ftsHits('dune')).toHaveLength(0);
	});

	it('scopes books to their library', () => {
		const id = saveBook(db, libraryId, base);
		expect(getBook(db, 'other', id)).toBeNull();
		expect(deleteBook(db, 'other', id)).toBe(false);
	});

	it('tracks reading history', () => {
		const id = saveBook(db, libraryId, base);
		startReading(db, libraryId, id, 'u1');
		const [r] = getBook(db, libraryId, id)!.readings;
		expect(r.finishedAt).toBeNull();
		finishReading(db, libraryId, r.id);
		expect(getBook(db, libraryId, id)!.readings[0].finishedAt).not.toBeNull();
	});
});
