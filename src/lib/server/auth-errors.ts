import { error } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';

/** Run a better-auth call, turning its errors into a 400 with the library's message. */
export async function authCall<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (e) {
		if (e instanceof APIError) error(400, e.message || 'Request failed');
		throw e;
	}
}
