import { count } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';

export const hasUsers = async () => {
	const [row] = await db.select({ n: count() }).from(user);
	return row.n > 0;
};
