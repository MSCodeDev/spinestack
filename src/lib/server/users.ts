import { count } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { user } from '#lib/server/db/schema.js';

export const hasUsers = async () => {
	const [row] = await db.select({ n: count() }).from(user);
	return row.n > 0;
};
