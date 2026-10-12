import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { gzipSync } from 'node:zlib';
import { BackupError, exportBackup, restoreBackup } from './backup.js';
import { createDb } from './db/factory.js';
import { library, user } from './db/schema.js';
import { getBook, saveBook } from './library/books.js';
import type { BookInput } from '../types.js';

const migrationsFolder = 'drizzle';
let dir: string;

const input = (title: string, author: string): BookInput =>
	({ title, authors: [author], tags: [], status: 'owned' }) as unknown as BookInput;

function open(name: string) {
	const live = createDb(path.join(dir, name));
	migrate(live.db, { migrationsFolder });
	return live;
}

function seed(live: ReturnType<typeof open>, ...books: [string, string][]) {
	live.db.insert(user).values({ id: 'u1', name: 'U', email: 'u@x.co' }).onConflictDoNothing().run();
	const lib =
		live.db.query.library.findFirst().sync()?.id ??
		live.db.insert(library).values({ ownerId: 'u1', name: 'L' }).returning().get().id;
	return { lib, ids: books.map(([title, author]) => saveBook(live.db, lib, input(title, author))) };
}

async function bytes(stream: AsyncIterable<Buffer>) {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(chunk);
	return Buffer.concat(chunks);
}

const titles = (live: ReturnType<typeof open>) =>
	(live.client.prepare('select title from book order by title').all() as { title: string }[]).map(
		(r) => r.title
	);

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-'));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('backups', () => {
	it('restores an exported backup, including search, over changed data', async () => {
		const live = open('live.db');
		const { lib, ids } = seed(live, ['Dune', 'Frank Herbert'], ['Emma', 'Jane Austen']);

		const { stream, books } = await exportBackup(live.client, path.join(dir, 'tmp'));
		const archive = await bytes(stream);
		expect(books).toBe(2);

		// the library changes after the backup
		live.db.delete((await import('./db/schema.js')).book).run();
		saveBook(live.db, lib, input('Neuromancer', 'William Gibson'));
		expect(titles(live)).toEqual(['Neuromancer']);

		const result = await restoreBackup(live, archive, {
			workDir: path.join(dir, 'work'),
			migrationsFolder
		});

		expect(result.books).toBe(2);
		expect(titles(live)).toEqual(['Dune', 'Emma']);
		expect(getBook(live.db, lib, ids[0])!.authors).toEqual(['Frank Herbert']);
		const hits = live.client
			.prepare("select book_id from book_fts where book_fts match 'herbert'")
			.all();
		expect(hits).toEqual([{ book_id: ids[0] }]);
	});

	it('accepts a plain, uncompressed database file', async () => {
		const source = open('source.db');
		seed(source, ['Dune', 'Frank Herbert']);
		await source.client.backup(path.join(dir, 'plain.db'));

		const live = open('live.db');
		const result = await restoreBackup(live, fs.readFileSync(path.join(dir, 'plain.db')), {
			workDir: path.join(dir, 'work'),
			migrationsFolder
		});
		expect(result.books).toBe(1);
		expect(titles(live)).toEqual(['Dune']);
	});

	it('leaves the library untouched when the file is not a backup', async () => {
		const live = open('live.db');
		seed(live, ['Dune', 'Frank Herbert']);
		const opts = { workDir: path.join(dir, 'work'), migrationsFolder };

		await expect(restoreBackup(live, Buffer.from('hello world'), opts)).rejects.toThrow(
			BackupError
		);
		await expect(restoreBackup(live, gzipSync('hello world'), opts)).rejects.toThrow(BackupError);

		// a valid SQLite file that is not ours
		const other = createDb(path.join(dir, 'other.db'));
		other.client.exec('create table t (x)');
		await other.client.backup(path.join(dir, 'other-copy.db'));
		await expect(
			restoreBackup(live, fs.readFileSync(path.join(dir, 'other-copy.db')), opts)
		).rejects.toThrow(/not a SpineStack backup/);

		expect(titles(live)).toEqual(['Dune']);
		expect(fs.readdirSync(path.join(dir, 'work'))).toEqual([]);
	});

	it('refuses a backup from a newer version', async () => {
		const source = open('source.db');
		seed(source, ['Emma', 'Jane Austen']);
		source.client
			.prepare('insert into __drizzle_migrations (hash, created_at) values (?, ?)')
			.run('future', 9_999_999_999_999);
		await source.client.backup(path.join(dir, 'future.db'));

		const live = open('live.db');
		seed(live, ['Dune', 'Frank Herbert']);
		await expect(
			restoreBackup(live, fs.readFileSync(path.join(dir, 'future.db')), {
				workDir: path.join(dir, 'work'),
				migrationsFolder
			})
		).rejects.toThrow(/newer version/);
		expect(titles(live)).toEqual(['Dune']);
	});

	it('rolls everything back when the backup is inconsistent', async () => {
		const source = open('source.db');
		seed(source, ['Emma', 'Jane Austen']);
		source.client.pragma('foreign_keys = OFF');
		source.client
			.prepare(
				"insert into book (id, library_id, title) values ('orphan', 'no-such-library', 'Orphan')"
			)
			.run();
		await source.client.backup(path.join(dir, 'bad.db'));

		const live = open('live.db');
		seed(live, ['Dune', 'Frank Herbert']);
		await expect(
			restoreBackup(live, fs.readFileSync(path.join(dir, 'bad.db')), {
				workDir: path.join(dir, 'work'),
				migrationsFolder
			})
		).rejects.toThrow(/inconsistent/);

		expect(titles(live)).toEqual(['Dune']);
		expect(live.client.pragma('foreign_keys', { simple: true })).toBe(1);
	});
});
