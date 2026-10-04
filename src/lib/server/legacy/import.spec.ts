import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCoverStore } from '../covers/store.js';
import { createDb, type Db } from '../db/factory.js';
import { library, user } from '../db/schema.js';
import { getBook } from '../library/books.js';
import { queryBooks } from '../library/list.js';
import { DEFAULT_QUERY } from '../../library/query.js';
import { downloadCovers, importLegacy, legacyTime, readLegacy, toBookInput } from './import.js';

const OLD_SCHEMA = `
	create table Book (id varchar primary key, created_at datetime, modified_at datetime, code varchar, barcode varchar,
		title varchar, is_in_library boolean, paid_price_currency varchar, paid_price_value float,
		label_price_currency varchar, label_price_value float, bought_at datetime, arrived_at datetime,
		synopsis varchar, page_count int, notes varchar, subtitle varchar);
	create table Person (id varchar primary key, name varchar);
	create table Contributor_Role (id varchar primary key, name varchar);
	create table Book_Contributor (id varchar primary key, book_id varchar, person_id varchar, role_id varchar, created_at datetime);
	create table Publisher (id varchar primary key, name varchar);
	create table Book_Publisher (book_id varchar, publisher_id varchar, created_at datetime);
	create table Read_Progress (id varchar primary key, book_id varchar, created_at datetime, started_at datetime, finished_at datetime, is_completed boolean);
`;

function legacyDb() {
	const old = new Database(':memory:');
	old.exec(OLD_SCHEMA);
	old.exec(`
		insert into Person values ('p1','Frank Herbert'), ('p2','Brian Herbert'), ('p3','Some Illustrator');
		insert into Contributor_Role values ('r1','Author'), ('r2','Illustrator');
		insert into Publisher values ('pub1','Ace'), ('pub2','Penguin');

		insert into Book values ('b1','2026-01-31 13:18:11','2026-01-31 13:50:58.975198679','9780441172719','9780441172719',
			'Dune',1,'ZAR',199.5,'ZAR',250,'2026-02-02 00:00:00','2026-02-10 00:00:00','Spice.\r\nAnd sand.',412,'','Book One');
		insert into Book values ('b2','2026-02-01 10:00:00','2026-02-01 10:00:00','9780306406152','',
			'Bad ISBN',1,'USD',0,'USD',0,null,null,'',0,'',''); -- invalid checksum
		insert into Book values ('b3','2026-02-02 10:00:00','2026-02-02 10:00:00','0306406152','',
			'Old ISBN-10 Book',0,'USD',0,'USD',0,null,null,'',250,'',''); -- ISBN-10, wishlist
		insert into Book values ('b4','2026-02-03 10:00:00','2026-02-03 10:00:00','','',
			'No Code',1,'USD',0,'USD',0,null,null,'',null,'','');
		insert into Book values ('b5','2026-02-04 10:00:00','2026-02-04 10:00:00','9780441172719','',
			'Dune again',1,'USD',0,'USD',0,null,null,'',null,'','');

		insert into Book_Contributor values ('c1','b1','p2','r1','2026-01-31 13:18:12'), ('c2','b1','p1','r1','2026-01-31 13:18:11'),
			('c3','b1','p3','r2','2026-01-31 13:18:13');
		insert into Book_Publisher values ('b1','pub1','2026-01-31 13:18:11'), ('b1','pub2','2026-01-31 13:18:12');
		insert into Read_Progress values ('rp1','b1','2026-03-01 09:00:00',null,null,1), ('rp2','b1','2026-03-02 09:00:00',null,null,0),
			('rp3','b3','2026-03-05 09:00:00',null,'2026-03-04 00:00:00',1);
	`);
	return old;
}

let db: Db;
let lib: string;
const userId = 'u1';

beforeEach(() => {
	({ db } = createDb(':memory:'));
	migrate(db, { migrationsFolder: 'drizzle' });
	db.insert(user).values({ id: userId, name: 'U', email: 'u@x.co' }).run();
	lib = db.insert(library).values({ ownerId: userId, name: 'L' }).returning().get().id;
});

describe('readLegacy', () => {
	it('flattens authors (oldest first), other roles, publisher and completed readings', () => {
		const { books } = readLegacy(legacyDb());
		expect(books).toHaveLength(5);
		const dune = books[0];
		expect(dune.authors).toEqual(['Frank Herbert', 'Brian Herbert']);
		expect(dune.otherContributors).toBe(1);
		expect(dune.publisher).toBe('Ace');
		expect(dune.synopsis).toBe('Spice.\nAnd sand.');
		expect(dune.readings).toEqual(['2026-03-01 09:00:00']);
		expect(books[2].readings).toEqual(['2026-03-04 00:00:00']);
	});
});

describe('toBookInput', () => {
	const base = readLegacy(legacyDb()).books;

	it('maps fields, treating 0 as unknown', () => {
		const { input } = toBookInput(base[0]);
		expect(input).toMatchObject({
			title: 'Dune',
			subtitle: 'Book One',
			isbn: '9780441172719',
			publisher: 'Ace',
			status: 'owned',
			pageCount: 412,
			currency: 'ZAR',
			paidPrice: 19950,
			labelPrice: 25000,
			boughtAt: '2026-02-02',
			arrivedAt: '2026-02-10'
		});
		const empty = toBookInput(base[3]).input;
		expect(empty).toMatchObject({
			isbn: null,
			currency: null,
			paidPrice: null,
			pageCount: null,
			subtitle: null
		});
	});

	it('converts ISBN-10, flags invalid ISBNs, and maps not-in-library to wishlist', () => {
		expect(toBookInput(base[2]).input).toMatchObject({ isbn: '9780306406157', status: 'wishlist' });
		expect(toBookInput(base[1])).toMatchObject({
			droppedIsbn: '9780306406152',
			input: { isbn: null }
		});
	});
});

describe('legacyTime', () => {
	it('parses old timestamps, including nanoseconds, as UTC', () => {
		expect(legacyTime('2026-01-31 13:18:11')).toBe(Date.UTC(2026, 0, 31, 13, 18, 11));
		expect(legacyTime('2026-01-31 13:50:58.975198679')).toBe(
			Date.UTC(2026, 0, 31, 13, 50, 58, 975)
		);
		expect(legacyTime('garbage')).toBeNull();
	});
});

describe('importLegacy', () => {
	it('imports books with relations, original dates and readings', () => {
		const report = importLegacy(db, lib, userId, readLegacy(legacyDb()));
		expect(report).toMatchObject({ imported: 4, readings: 2, otherContributors: 1 });
		expect(report.duplicates).toEqual(['Dune again']);
		expect(report.invalidIsbn).toEqual(['Bad ISBN (9780306406152)']);
		expect(report.forCovers.map((c) => c.isbn)).toEqual(['9780441172719', '9780306406157']);

		const { items } = queryBooks(
			db,
			lib,
			{ ...DEFAULT_QUERY, sort: 'added', dir: 'asc' },
			{ offset: 0, limit: 10 }
		);
		expect(items.map((i) => i.title)).toEqual(['Dune', 'Bad ISBN', 'Old ISBN-10 Book', 'No Code']);
		const dune = getBook(db, lib, items[0].id)!;
		expect(dune).toMatchObject({
			authors: ['Frank Herbert', 'Brian Herbert'],
			publisher: 'Ace',
			paidPrice: 19950
		});
		expect(dune.createdAt).toBe(Date.UTC(2026, 0, 31, 13, 18, 11));
		expect(dune.readings).toHaveLength(1);
		// the search index was filled too
		expect(db.all(sql`select book_id from book_fts where book_fts match 'herbert'`)).toHaveLength(
			1
		);
	});

	it('is safe to run twice: everything already there is reported as a duplicate', () => {
		const data = readLegacy(legacyDb());
		importLegacy(db, lib, userId, data);
		const again = importLegacy(db, lib, userId, data);
		expect(again.imported).toBe(0);
		expect(again.duplicates).toHaveLength(5);
	});

	it('a dry run changes nothing', () => {
		const report = importLegacy(db, lib, userId, readLegacy(legacyDb()), { dryRun: true });
		expect(report.imported).toBe(4);
		expect(queryBooks(db, lib, DEFAULT_QUERY, { offset: 0, limit: 10 }).total).toBe(0);
		expect(db.all(sql`select * from reading`)).toHaveLength(0);
	});
});

describe('downloadCovers', () => {
	let dir: string;
	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-covers-'));
	});
	afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

	it('sets covers where an image exists and counts the rest', async () => {
		const report = importLegacy(db, lib, userId, readLegacy(legacyDb()));
		const png = await sharp({
			create: { width: 200, height: 300, channels: 3, background: '#2040c0' }
		})
			.png()
			.toBuffer();
		const store = createCoverStore(dir);
		const seen: string[] = [];
		const result = await downloadCovers(db, store, lib, report.forCovers, {
			fetchImage: async (url) => {
				seen.push(url);
				if (url.includes('9780306406157')) throw new Error('404');
				return png;
			}
		});
		expect(result).toEqual({ done: 2, total: 2, ok: 1 });
		expect(seen.every((u) => u.startsWith('https://covers.openlibrary.org/b/isbn/'))).toBe(true);
		const all = queryBooks(db, lib, DEFAULT_QUERY, { offset: 0, limit: 10 });
		expect(all.items.filter((i) => i.coverVersion > 0).map((i) => i.title)).toEqual(['Dune']);
	});
});
