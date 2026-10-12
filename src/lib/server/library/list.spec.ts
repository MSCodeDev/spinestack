import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb, type Db } from '../db/factory.js';
import { book as bookTable, library, user } from '../db/schema.js';
import { eq } from 'drizzle-orm';
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

/** Pretend a book was added on the given day. */
const addedOn = (id: string, day: string) =>
	db
		.update(bookTable)
		.set({ createdAt: new Date(`${day}T12:00:00Z`) })
		.where(eq(bookTable.id, id))
		.run();
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

	it('returns every match when there is no limit', () => {
		const all = queryBooks(
			db,
			lib,
			{ ...DEFAULT_QUERY, sort: 'title', dir: 'asc' },
			{ offset: 0, limit: null }
		);
		expect(all.items).toHaveLength(4);
		expect(all.total).toBe(4);
		const rest = queryBooks(
			db,
			lib,
			{ ...DEFAULT_QUERY, sort: 'title', dir: 'asc' },
			{ offset: 1, limit: null }
		);
		expect(rest.items.map((i) => i.title)).toEqual(['Dune', 'Dune Messiah', 'Emma']);
	});

	it('returns authors in order and stays within the library', () => {
		const [item] = queryBooks(db, lib, { ...DEFAULT_QUERY, q: 'emma' }, page).items;
		expect(item.authors).toEqual(['Jane Austen']);
		expect(queryBooks(db, 'other', DEFAULT_QUERY, page).total).toBe(0);
	});
});

describe('queryBooks filters and groups', () => {
	let hobbit: string;

	beforeEach(() => {
		const dune = saveBook(
			db,
			lib,
			book({
				title: 'Dune',
				authors: ['Frank Herbert'],
				publisher: 'Ace',
				location: 'Study',
				tags: ['scifi'],
				currency: 'USD',
				paidPrice: 1000
			})
		);
		const emma = saveBook(
			db,
			lib,
			book({
				title: 'Emma',
				authors: ['Jane Austen'],
				publisher: 'Penguin',
				location: 'Hall',
				tags: ['classic'],
				currency: 'USD',
				paidPrice: 500
			})
		);
		hobbit = saveBook(
			db,
			lib,
			book({
				title: 'Hobbit',
				authors: ['J.R.R. Tolkien'],
				publisher: 'Ace',
				status: 'wishlist',
				currency: 'JPY',
				paidPrice: 900
			})
		);
		addedOn(dune, '2024-03-01');
		addedOn(emma, '2023-05-01');
		addedOn(hobbit, '2023-08-01');
		startReading(db, lib, hobbit, 'u1');
	});

	it('filters by entity names, any-of within a filter', () => {
		expect(titles({ publisher: ['ace'] }).sort()).toEqual(['Dune', 'Hobbit']);
		expect(titles({ publisher: ['Ace', 'Penguin'] }).sort()).toEqual(['Dune', 'Emma', 'Hobbit']);
		expect(titles({ location: ['Study'] })).toEqual(['Dune']);
		expect(titles({ location: ['Study'], publisher: ['Penguin'] })).toEqual([]);
	});

	it('filters by reading state', () => {
		expect(titles({ reading: 'reading' })).toEqual(['Hobbit']);
		expect(titles({ reading: 'unread' }).sort()).toEqual(['Dune', 'Emma']);
	});

	it('filters by one price field in major units: exact, range or open-ended', () => {
		// Dune $10.00, Emma $5.00, Hobbit ¥900 (no minor units)
		expect(titles({ price: '10' })).toEqual(['Dune']);
		expect(titles({ price: '10.00' })).toEqual(['Dune']);
		expect(titles({ price: '6-20' })).toEqual(['Dune']);
		expect(titles({ price: '6-' }).sort()).toEqual(['Dune', 'Hobbit']);
		expect(titles({ price: '-9' })).toEqual(['Emma']);
		expect(titles({ price: '900' })).toEqual(['Hobbit']);
		expect(titles({ price: 'not a price' })).toHaveLength(3); // unclear text filters nothing
	});

	it('filters by one date-added field: a year, a month, or a range', () => {
		expect(titles({ date: '2023' }).sort()).toEqual(['Emma', 'Hobbit']);
		expect(titles({ date: '2024-03' })).toEqual(['Dune']);
		expect(titles({ date: '2023-06..2024-12' }).sort()).toEqual(['Dune', 'Hobbit']);
		expect(titles({ date: '2024..' })).toEqual(['Dune']);
	});

	it('groups with labels, ordered groups and counts', () => {
		const result = queryBooks(
			db,
			lib,
			{ ...DEFAULT_QUERY, group: 'publisher', sort: 'title', dir: 'asc' },
			page
		);
		expect(result.items.map((i) => [i.group, i.title])).toEqual([
			['Ace', 'Dune'],
			['Ace', 'Hobbit'],
			['Penguin', 'Emma']
		]);
		expect(result.groups).toEqual([
			{ label: 'Ace', count: 2 },
			{ label: 'Penguin', count: 1 }
		]);
	});

	it('groups by month added, newest first', () => {
		const result = queryBooks(db, lib, { ...DEFAULT_QUERY, group: 'addedMonth' }, page);
		expect(result.groups!.map((g) => g.label)).toEqual(['2024-03', '2023-08', '2023-05']);
	});

	it('groups by reading state in a fixed order', () => {
		const result = queryBooks(db, lib, { ...DEFAULT_QUERY, group: 'reading' }, page);
		expect(result.groups!.map((g) => g.label)).toEqual(['reading', 'unread']);
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
			authors: 1,
			// $5 and $10 paid, plus a wishlist book at $99.99, rounded outwards
			priceRange: { min: 5, max: 100 }
		});

		const readingId = db.all<{ id: string }>(sql`select id from reading`)[0].id;
		finishReading(db, lib, readingId);
		const after = getStats(db, lib, new Date());
		expect(after.reading).toBe(0);
		expect(after.readThisYear).toBe(1);
	});
});

describe('getStats price range', () => {
	it('is null when no book has a price', () => {
		saveBook(db, lib, book({ title: 'Free' }));
		expect(getStats(db, lib).priceRange).toBeNull();
	});

	it('never collapses to a single point', () => {
		saveBook(db, lib, book({ title: 'A', currency: 'USD', paidPrice: 1000 }));
		expect(getStats(db, lib).priceRange).toEqual({ min: 10, max: 11 });
	});

	it('reports the span of days books were added, widening a single day', () => {
		const a = saveBook(db, lib, book({ title: 'A' }));
		addedOn(a, '2024-05-01');
		expect(getStats(db, lib).dateRange).toEqual({ min: '2024-05-01', max: '2024-05-02' });
		const b = saveBook(db, lib, book({ title: 'B' }));
		addedOn(b, '2023-12-31');
		expect(getStats(db, lib).dateRange).toEqual({ min: '2023-12-31', max: '2024-05-01' });
	});

	it('is null for an empty library', () => {
		expect(getStats(db, lib).dateRange).toBeNull();
	});
});
