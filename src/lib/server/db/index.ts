import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';
import { databaseUrl } from '$lib/server/config';

fs.mkdirSync(path.dirname(path.resolve(databaseUrl)), { recursive: true });

export const client = new Database(databaseUrl);
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');

export const db = drizzle(client, { schema });

export const runMigrations = () => migrate(db, { migrationsFolder: path.resolve('drizzle') });
