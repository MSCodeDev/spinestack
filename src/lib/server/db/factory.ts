import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema.js';

export function createDb(url: string) {
	if (url !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(url)), { recursive: true });

	const client = new Database(url);
	client.pragma('journal_mode = WAL');
	client.pragma('foreign_keys = ON');

	return { client, db: drizzle(client, { schema }) };
}

export type Db = ReturnType<typeof createDb>['db'];
