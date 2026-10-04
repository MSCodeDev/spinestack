import { env } from '$env/dynamic/private';
import path from 'node:path';

export const dataDir = path.resolve(env.DATA_DIR || './data');
export const databaseUrl = env.DATABASE_URL || path.join(dataDir, 'spinestack.db');
export const googleBooksKey = env.GOOGLE_BOOKS_API_KEY || undefined;
