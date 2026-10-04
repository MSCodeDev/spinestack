export type Http = { json(url: string): Promise<unknown> };

export class HttpError extends Error {
	constructor(
		readonly status: number,
		url: string
	) {
		super(`Request failed (${status}): ${new URL(url).hostname}`);
	}
}

type Options = { fetchFn?: typeof fetch; ttlMs?: number; maxEntries?: number; timeoutMs?: number };

/** JSON GETs with a timeout and a small in-memory TTL cache, to stay polite to public APIs. */
export function createHttp({
	fetchFn = fetch,
	ttlMs = 5 * 60_000,
	maxEntries = 200,
	timeoutMs = 8_000
}: Options = {}): Http {
	const cache = new Map<string, { at: number; value: unknown }>();

	return {
		async json(url) {
			const hit = cache.get(url);
			if (hit && Date.now() - hit.at < ttlMs) return hit.value;

			const res = await fetchFn(url, {
				signal: AbortSignal.timeout(timeoutMs),
				headers: {
					accept: 'application/json',
					'user-agent': 'SpineStack (self-hosted book manager)'
				}
			});
			if (!res.ok) throw new HttpError(res.status, url);
			const value = await res.json();

			cache.set(url, { at: Date.now(), value });
			if (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
			return value;
		}
	};
}
