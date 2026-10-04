import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { admin } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { library } from '$lib/server/db/schema';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	// Accounts are created by the first-run setup or by an admin.
	emailAndPassword: { enabled: true, disableSignUp: true },
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await db.insert(library).values({ ownerId: user.id, name: 'Library' });
				}
			}
		}
	},
	plugins: [
		admin(),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
