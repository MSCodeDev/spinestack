import { googleBooksKey, hardcoverToken } from '#lib/server/config.js';
import { createHttp } from './http.js';
import { createMetadata } from './index.js';

/** Shared so the response cache serves every provider lookup. */
export const http = createHttp();
export const metadata = createMetadata({ http, googleBooksKey, hardcoverToken });
