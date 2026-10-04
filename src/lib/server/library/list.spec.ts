import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb, type Db } from '../db/factory.js';
import { library, user } from '../db/schema.js';
import type { BookInput } from '../../types.js';
import { DEFAULT_QUERY } from '../../library/query.js';
import { finishReading, saveBook, startReading } from './books.js';
import { queryBooks } from './list.js';
import { getStats } from './stats.js';

const book = (over: Partial<BookInput>): BookInput => ({
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
const page = { offset: 0, limit: 10 };
const titles = (q: Partial<typeof DEFAULT_QUERY>, p = page) =>
	queryBooks(db, lib, { ...DEFAULT_QUERY, ...q }, p).items.map((i) => i.title);

beforeEach(() => {
	({ db } = createDb(':memory:'));
	migrate(db, { migrationsFolder: 'drizzle' });
	db.insert(user).values({ id: 'u1', name: 'U', email: 'u@x.co' }).run();
	lib = db.insert(library).values({ ownerId: 'u1', name: 'L' }).returning().get().id;
});

describe('queryBooks', () => {
	beforeEach(() => {
		saveBook(
			db,
			lib,
			book({
				title: 'Dune',
				authors: ['Frank Herbert'],
				pageCount: 400,
				series: 'Dune',
				seriesNumber: '1'
			})
		);
		saveBook(
			db,
			lib,
			book({
				title: 'Dune Messiah',
				authors: ['Frank Herbert'],
				pageCount: 250,
				series: 'Dune',
				seriesNumber: '2'
			})
		);
		saveBook(db, lib, book({ title: 'Emma', authors: ['Jane Austen'] }));
		saveBook(db, lib, book({ title: 'Archive', authors: ['Zed'] }));
	});

	it('searches by prefix across fields', () => {
		expect(titles({ q: 'herb' }).sort()).toEqual(['Dune', 'Dune Messiah']);
		expect(titles({ q: 'dune mess' })).toEqual(['Dune Messiah']);
		expect(titles({ q: 'nothing' })).toEqual([]);
	});

	it('sorts with nulls last in both directions', () => {
		expect(titles({ sort: 'pages', dir: 'desc' }).slice(0, 2)).toEqual(['Dune', 'Dune Messiah']);
		expect(titles({ sort: 'pages', dir: 'asc' }).slice(0, 2)).toEqual(['Dune Messiah', 'Dune']);
		expect(titles({ sort: 'title', dir: 'asc' })[0]).toBe('Archive');
	});

	it('sorts by author name and by series then number', () => {
		expect(titles({ sort: 'author', dir: 'asc' })).toEqual([
			'Dune',
			'Dune Messiah',
			'Emma',
			'Archive'
		]);
		const bySeries = titles({ sort: 'series', dir: 'asc' });
		expect(bySeries.slice(0, 2)).toEqual(['Dune', 'Dune Messiah']);
	});

	it('paginates with a total', () => {
		const first = queryBooks(
			db,
			lib,
			{ ...DEFAULT_QUERY, sort: 'title', dir: 'asc' },
			{ offset: 0, limit: 3 }
		);
		expect(first.total).toBe(4);
		expect(first.items).toHaveLength(3);
		expect(titles({ sort: 'title', dir: 'asc' }, { offset: 3, limit: 3 })).toEqual(['Emma']);
	});

	it('returns authors in order and stays within the library', () => {
		const [item] = queryBooks(db, lib, { ...DEFAULT_QUERY, q: 'emma' }, page).items;
		expect(item.authors).toEqual(['Jane Austen']);
		expect(queryBooks(db, 'other', DEFAULT_QUERY, page).total).toBe(0);
	});
});

describe('getStats', () => {
	it('aggregates counts, spend and reading', () => {
		const now = new Date('2026-10-15T12:00:00Z');
		const a = saveBook(
			db,
			lib,
			book({
				title: 'A',
				authors: ['X'],
				series: 'S',
				currency: 'USD',
				paidPrice: 1000,
				boughtAt: '2026-10-02'
			})
		);
		saveBook(
			db,
			lib,
			book({ title: 'B', currency: 'USD', paidPrice: 500, boughtAt: '2026-01-02' })
		);
		saveBook(db, lib, book({ title: 'W', status: 'wishlist', currency: 'USD', paidPrice: 9999 }));
		startReading(db, lib, a, 'u1');
		const stats = getStats(db, lib, now);
		expect(stats).toMatchObject({
			owned: 2,
			wishlist: 1,
			spentThisMonth: [{ currency: 'USD', minor: 1000 }],
			spentTotal: [{ currency: 'USD', minor: 1500 }],
			reading: 1,
			readThisYear: 0,
			series: 1,
			authors: 1
		});

		const readingId = db.all<{ id: string }>(sql`select id from reading`)[0].id;
		finishReading(db, lib, readingId);
		const after = getStats(db, lib, new Date());
		expect(after.reading).toBe(0);
		expect(after.readThisYear).toBe(1);
	});
});
