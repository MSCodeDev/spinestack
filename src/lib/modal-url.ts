import { resolve } from '$app/paths';
import { page } from '$app/state';
import { LIST_PARAM_KEYS, serializeQuery, type LibraryQuery } from './library/query.js';

/** Query string with the given params set (string) or removed (null). */
export function withParams(url: { search: string }, changes: Record<string, string | null>) {
	const params = new URLSearchParams(url.search);
	for (const [key, value] of Object.entries(changes)) {
		if (value === null) params.delete(key);
		else params.set(key, value);
	}
	const search = params.toString();
	return search ? `?${search}` : '';
}

/** Replace the list query params in the current URL, keeping modal params. */
export function withQuery(url: { search: string }, query: LibraryQuery) {
	const params = new URLSearchParams(url.search);
	for (const key of LIST_PARAM_KEYS) params.delete(key);
	for (const [key, value] of serializeQuery(query)) params.append(key, value);
	const search = params.toString();
	return search ? `?${search}` : '';
}

/** Link to the library page with modal params changed and the list state kept. */
export const modalHref = (changes: Record<string, string | null>) =>
	resolve('/(app)') + withParams(page.url, changes);
