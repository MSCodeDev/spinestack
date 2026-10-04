import { DATA_DIR, DATABASE_URL, GOOGLE_BOOKS_API_KEY } from '$app/env/private';
import path from 'node:path';

export const dataDir = path.resolve(DATA_DIR);
export const databaseUrl = DATABASE_URL ?? path.join(dataDir, 'spinestack.db');
export const googleBooksKey = GOOGLE_BOOKS_API_KEY;
