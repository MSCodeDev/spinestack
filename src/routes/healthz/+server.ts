import { client } from '#lib/server/db/index.js';
import type { RequestHandler } from './$types';

/** Liveness check for containers and uptime monitors; touches the database. */
export const GET: RequestHandler = () => {
	client.prepare('select 1').get();
	return new Response('ok', { headers: { 'cache-control': 'no-store' } });
};
