import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sql } from 'drizzle-orm';
import { createDb, type Db } from '../db/factory.js';
import { library, user } from '../db/schema.js';
import type { BookInput } from '../../types.js';
import { getBook, saveBook } from './books.js';
import {
	EntityNameError,
	deleteEntity,
	deleteUnused,
	listEntities,
	renameEntity
} from './entities.js';

const input = (over: Partial<BookInput>): BookInput => ({
	title: 'T',
	subtitle: null,
	authors: [],
	isbn: null,
	publisher: null,
	series: null,
	seriesNumber: null,
	location: null,
	tags: [],
	status: 'owned',
	pageCount: null,
	language: null,
	synopsis: null,
	notes: null,
	currency: null,
	labelPrice: null,
	paidPrice: null,
	boughtAt: null,
	arrivedAt: null,
	...over
});

let db: Db;
let lib: string;
const hits = (q: string) =>
	db.all<{ book_id: string }>(sql`select book_id from book_fts where book_fts match ${q}`).length;
const idOf = (kind: Parameters<typeof listEntities>[2], name: string) =>
	listEntities(db, lib, kind).find((e) => e.name === name)!.id;

beforeEach(() => {
	({ db } = createDb(':memory:'));
	migrate(db, { migrationsFolder: 'drizzle' });
	db.insert(user).values({ id: 'u1', name: 'U', email: 'u@x.co' }).run();
	lib = db.insert(library).values({ ownerId: 'u1', name: 'L' }).returning().get().id;
});

describe('entities', () => {
	it('lists entities with usage counts', () => {
		saveBook(db, lib, input({ title: 'A', publisher: 'Ace', tags: ['x', 'y'], authors: ['F'] }));
		saveBook(db, lib, input({ title: 'B', publisher: 'Ace', tags: ['x'] }));
		expect(listEntities(db, lib, 'publisher')).toEqual([
			{ id: expect.any(String), name: 'Ace', count: 2 }
		]);
		expect(listEntities(db, lib, 'tag').map((t) => [t.name, t.count])).toEqual([
			['x', 2],
			['y', 1]
		]);
		expect(listEntities(db, 'other', 'tag')).toEqual([]);
	});

	it('renames and keeps search in sync', () => {
		const b = saveBook(db, lib, input({ publisher: 'Ace', location: 'Study' }));
		expect(renameEntity(db, lib, 'publisher', idOf('publisher', 'Ace'), 'Ace Books')).toEqual({
			merged: false
		});
		expect(getBook(db, lib, b)!.publisher).toBe('Ace Books');
		expect(hits('books')).toBe(1);
		expect(hits('"ace"')).toBe(1);

		renameEntity(db, lib, 'location', idOf('location', 'Study'), 'Library');
		expect(getBook(db, lib, b)!.location).toBe('Library');
	});

	it('rejects empty names and unknown ids', () => {
		saveBook(db, lib, input({ publisher: 'Ace' }));
		expect(() => renameEntity(db, lib, 'publisher', idOf('publisher', 'Ace'), '  ')).toThrow(
			EntityNameError
		);
		expect(renameEntity(db, lib, 'publisher', 'nope', 'X')).toBeNull();
		expect(renameEntity(db, 'other', 'publisher', idOf('publisher', 'Ace'), 'X')).toBeNull();
	});

	it('merges into an existing entity regardless of case', () => {
		const a = saveBook(
			db,
			lib,
			input({ title: 'A', authors: ['Frank Herbert'], publisher: 'Ace', tags: ['sf'] })
		);
		const b = saveBook(
			db,
			lib,
			input({
				title: 'B',
				authors: ['F. Herbert', 'Frank Herbert'],
				publisher: 'Ace Books',
				tags: ['SF-old']
			})
		);

		expect(renameEntity(db, lib, 'author', idOf('author', 'F. Herbert'), 'frank herbert')).toEqual({
			merged: true
		});
		expect(listEntities(db, lib, 'author').map((x) => [x.name, x.count])).toEqual([
			['Frank Herbert', 2]
		]);
		expect(getBook(db, lib, b)!.authors).toEqual(['Frank Herbert']);

		expect(renameEntity(db, lib, 'publisher', idOf('publisher', 'Ace Books'), 'ace')).toEqual({
			merged: true
		});
		expect(getBook(db, lib, b)!.publisher).toBe('Ace');

		renameEntity(db, lib, 'tag', idOf('tag', 'SF-old'), 'sf');
		expect(getBook(db, lib, b)!.tags).toEqual(['sf']);
		expect(getBook(db, lib, a)!.tags).toEqual(['sf']);
	});

	it('deletes with relations cleared and reports the books affected', () => {
		const b = saveBook(db, lib, input({ authors: ['Zed'], series: 'S', location: 'Hall' }));
		expect(deleteEntity(db, lib, 'author', idOf('author', 'Zed'))).toBe(1);
		expect(getBook(db, lib, b)!.authors).toEqual([]);
		expect(hits('zed')).toBe(0);

		expect(deleteEntity(db, lib, 'series', idOf('series', 'S'))).toBe(1);
		expect(getBook(db, lib, b)!.series).toBeNull();
		expect(deleteEntity(db, lib, 'location', 'nope')).toBeNull();
	});

	it('deletes unused entities only', () => {
		const b = saveBook(db, lib, input({ tags: ['keep', 'drop'] }));
		saveBook(db, lib, input({ title: 'Other', tags: ['drop'] }));
		deleteEntity(db, lib, 'tag', idOf('tag', 'drop')); // detach, then recreate unused
		saveBook(db, lib, input({ title: 'C', tags: ['gone'] }), undefined);
		const c = db.all<{ id: string }>(sql`select id from book where title = 'C'`)[0].id;
		saveBook(db, lib, input({ title: 'C', tags: [] }), c);
		expect(deleteUnused(db, lib, 'tag')).toBe(1);
		expect(listEntities(db, lib, 'tag').map((t) => t.name)).toEqual(['keep']);
		expect(getBook(db, lib, b)!.tags).toEqual(['keep']);
	});
});
