import { eq } from 'drizzle-orm';
import type { Db } from './db/factory.js';
import { userPreference } from './db/schema.js';
import { normalizePreferences, parsePreferencesPatch, type Preferences } from '../preferences.js';

export function getPreferences(db: Db, userId: string): Preferences {
	const rows = db.select().from(userPreference).where(eq(userPreference.userId, userId)).all();
	return normalizePreferences(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

/** Merge a patch into the stored preferences; invalid fields are ignored. */
export function setPreferences(
	db: Db,
	userId: string,
	patch: Record<string, unknown>
): Preferences {
	const next = { ...getPreferences(db, userId), ...parsePreferencesPatch(patch) };
	db.transaction((tx) => {
		for (const [key, value] of Object.entries(next)) {
			tx.insert(userPreference)
				.values({ userId, key, value: String(value) })
				.onConflictDoUpdate({
					target: [userPreference.userId, userPreference.key],
					set: { value: String(value) }
				})
				.run();
		}
	});
	return next;
}
