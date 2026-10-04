import { googleBooksKey } from '#lib/server/config.js';
import { createHttp } from './http.js';
import { createMetadata } from './index.js';

export const metadata = createMetadata({ http: createHttp(), googleBooksKey });
