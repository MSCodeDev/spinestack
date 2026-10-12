import type Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { createGzip, gunzipSync } from 'node:zlib';
import { createDb, type Db } from './db/factory.js';
import { rebuildFts } from './library/fts.js';

export class BackupError extends Error {}

/** Largest backup accepted once decompressed. */
const MAX_BYTES = 512 * 1024 * 1024;
const SQLITE_HEADER = 'SQLite format 3\0';

type Live = { client: Database.Database; db: Db };

/**
 * A gzipped, point-in-time copy of the database. Safe while the app is running: the snapshot goes
 * through SQLite's backup API, so it includes everything in the write-ahead log.
 */
export async function exportBackup(
	client: Database.Database,
	tmpDir: string
): Promise<{ stream: Readable; books: number }> {
	fs.mkdirSync(tmpDir, { recursive: true });
	const snapshot = path.join(tmpDir, `.export-${crypto.randomUUID()}.db`);
	await client.backup(snapshot);

	const books = (client.prepare('select count(*) as n from book').get() as { n: number }).n;
	const stream = fs.createReadStream(snapshot).pipe(createGzip());
	// Removed once the download ends or is abandoned.
	stream.on('close', () => fs.rmSync(snapshot, { force: true }));
	return { stream, books };
}

const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

/** Tables worth copying: the app's own, not SQLite internals, the search index or migration state. */
const tablesOf = (conn: Database.Database, schema: 'main' | 'restore') =>
	(
		conn
			.prepare(
				`select name from ${schema}.sqlite_master
				 where type = 'table' and name not like 'sqlite_%' and name not like 'book_fts%'
				   and name != '__drizzle_migrations'`
			)
			.all() as { name: string }[]
	).map((r) => r.name);

const columnsOf = (conn: Database.Database, schema: 'main' | 'restore', table: string) =>
	(conn.pragma(`${schema}.table_info(${quote(table)})`) as { name: string }[]).map((c) => c.name);

/** Bring a backup's bytes to a plain SQLite file, whether it was gzipped or not. */
function unpack(data: Buffer): Buffer {
	let bytes = data;
	if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
		try {
			bytes = gunzipSync(bytes, { maxOutputLength: MAX_BYTES });
		} catch {
			throw new BackupError('This file could not be read. Is it a SpineStack backup?');
		}
	}
	if (bytes.subarray(0, SQLITE_HEADER.length).toString('latin1') !== SQLITE_HEADER) {
		throw new BackupError('This is not a SpineStack backup.');
	}
	return bytes;
}

/** The newest migration the app knows about, from drizzle's journal. */
function newestKnownMigration(migrationsFolder: string): number {
	const journal = JSON.parse(
		fs.readFileSync(path.join(migrationsFolder, 'meta', '_journal.json'), 'utf8')
	) as { entries: { when: number }[] };
	return Math.max(...journal.entries.map((e) => e.when));
}

/**
 * Replace the contents of the live database with a backup's, in one transaction: either all of it
 * is restored or none of it. Sessions and accounts are part of the data, so the person restoring
 * may need to sign in again afterwards.
 */
export async function restoreBackup(
	{ client, db }: Live,
	data: Buffer,
	{ workDir, migrationsFolder }: { workDir: string; migrationsFolder: string }
): Promise<{ books: number }> {
	const bytes = unpack(data);

	fs.mkdirSync(workDir, { recursive: true });
	const staged = path.join(workDir, `.restore-${crypto.randomUUID()}.db`);
	fs.writeFileSync(staged, bytes);

	try {
		// Check the file on its own before it goes anywhere near the live database.
		const { client: candidate, db: candidateDb } = createDb(staged);
		try {
			if ((candidate.pragma('integrity_check', { simple: true }) as string) !== 'ok') {
				throw new BackupError('The backup is damaged.');
			}
			const tables = new Set(tablesOf(candidate, 'main'));
			for (const needed of ['user', 'library', 'book']) {
				if (!tables.has(needed)) throw new BackupError('This is not a SpineStack backup.');
			}
			const applied = (
				candidate.prepare('select max(created_at) as at from __drizzle_migrations').get() as {
					at: number | null;
				}
			).at;
			if (applied !== null && applied > newestKnownMigration(migrationsFolder)) {
				throw new BackupError('This backup was made by a newer version of SpineStack.');
			}
			// Older backups come up to date first, so the tables line up.
			migrate(candidateDb, { migrationsFolder });
		} catch (e) {
			if (e instanceof BackupError) throw e;
			throw new BackupError('This is not a SpineStack backup.');
		} finally {
			candidate.close();
		}

		client.prepare('attach database ? as restore').run(staged);
		try {
			client.pragma('foreign_keys = OFF');
			client.transaction(() => {
				const have = new Set(tablesOf(client, 'restore'));
				for (const table of tablesOf(client, 'main')) {
					client.exec(`delete from main.${quote(table)}`);
					if (!have.has(table)) continue;

					const shared = columnsOf(client, 'main', table).filter((c) =>
						columnsOf(client, 'restore', table).includes(c)
					);
					if (!shared.length) continue;
					const cols = shared.map(quote).join(', ');
					client.exec(
						`insert into main.${quote(table)} (${cols}) select ${cols} from restore.${quote(table)}`
					);
				}
				rebuildFts(db);

				if ((client.pragma('foreign_key_check') as unknown[]).length) {
					throw new BackupError('The backup is inconsistent and was not restored.');
				}
			})();
		} finally {
			client.pragma('foreign_keys = ON');
			client.exec('detach database restore');
		}

		return { books: (client.prepare('select count(*) as n from book').get() as { n: number }).n };
	} finally {
		for (const suffix of ['', '-wal', '-shm']) fs.rmSync(staged + suffix, { force: true });
	}
}
