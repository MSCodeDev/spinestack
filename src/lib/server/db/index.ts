import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { databaseUrl } from '#lib/server/config.js';
import { createDb } from './factory.js';

export const { client, db } = createDb(databaseUrl);

export const runMigrations = () => migrate(db, { migrationsFolder: path.resolve('drizzle') });
