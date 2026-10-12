import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (input: string | undefined) => input || undefined;

export const variables = defineEnvVars({
	ORIGIN: { schema: optional },
	// better-auth validates the secret itself
	BETTER_AUTH_SECRET: { schema: (input) => input ?? '' },
	DATA_DIR: { schema: (input) => input || './data' },
	DATABASE_URL: { schema: optional },
	GOOGLE_BOOKS_API_KEY: { schema: optional },
	HARDCOVER_API_TOKEN: { schema: optional }
});
