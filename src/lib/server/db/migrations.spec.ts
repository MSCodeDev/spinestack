import fs from 'node:fs';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

const statements = (file: string) =>
	fs
		.readFileSync(`drizzle/${file}`, 'utf8')
		.split('--> statement-breakpoint')
		.map((s) => s.trim())
		.filter(Boolean);

describe('fts_location migration', () => {
	it('rebuilds the search index from existing data, now including location', () => {
		const db = new Database(':memory:');
		for (const file of ['0000_init.sql', '0001_fts.sql']) {
			for (const sql of statements(file)) db.exec(sql);
		}

		db.exec(`
			insert into user (id, name, email) values ('u', 'U', 'u@x.co');
			insert into library (id, owner_id, name) values ('l', 'u', 'L');
			insert into location (id, library_id, name) values ('loc', 'l', 'Study');
			insert into person (id, library_id, name) values ('p', 'l', 'Frank Herbert');
			insert into book (id, library_id, title, location_id) values ('b', 'l', 'Dune', 'loc');
			insert into book_person (book_id, person_id) values ('b', 'p');
		`);
		// the old index has no row for the book yet; the migration must create it
		expect(db.prepare('select count(*) as n from book_fts').get()).toEqual({ n: 0 });

		for (const sql of statements('0002_fts_location.sql')) db.exec(sql);

		const hit = (q: string) =>
			db.prepare('select book_id from book_fts where book_fts match ?').all(q) as {
				book_id: string;
			}[];
		expect(hit('dune')).toEqual([{ book_id: 'b' }]);
		expect(hit('herbert')).toEqual([{ book_id: 'b' }]);
		expect(hit('study')).toEqual([{ book_id: 'b' }]);
	});
});
