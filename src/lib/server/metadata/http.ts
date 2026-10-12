export type Http = {
	json(url: string): Promise<unknown>;
	/** POST a JSON body and read a JSON reply (GraphQL). */
	post(url: string, body: unknown, headers?: Record<string, string>): Promise<unknown>;
};

export class HttpError extends Error {
	constructor(
		readonly status: number,
		url: string
	) {
		super(`Request failed (${status}): ${new URL(url).hostname}`);
	}
}

type Options = { fetchFn?: typeof fetch; ttlMs?: number; maxEntries?: number; timeoutMs?: number };

/** JSON requests with a timeout and a small in-memory TTL cache, to stay polite to public APIs. */
export function createHttp({
	fetchFn = fetch,
	ttlMs = 5 * 60_000,
	maxEntries = 200,
	timeoutMs = 8_000
}: Options = {}): Http {
	const cache = new Map<string, { at: number; value: unknown }>();

	async function request(url: string, init: RequestInit, key: string) {
		const hit = cache.get(key);
		if (hit && Date.now() - hit.at < ttlMs) return hit.value;

		const res = await fetchFn(url, {
			...init,
			signal: AbortSignal.timeout(timeoutMs),
			headers: {
				accept: 'application/json',
				'user-agent': 'SpineStack (self-hosted book manager)',
				...init.headers
			}
		});
		if (!res.ok) throw new HttpError(res.status, url);
		const value = await res.json();

		cache.set(key, { at: Date.now(), value });
		if (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
		return value;
	}

	return {
		json: (url) => request(url, {}, url),
		post(url, body, headers = {}) {
			const payload = JSON.stringify(body);
			return request(
				url,
				{
					method: 'POST',
					body: payload,
					headers: { 'content-type': 'application/json', ...headers }
				},
				`POST ${url} ${payload}`
			);
		}
	};
}
