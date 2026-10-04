/** JSON request to our own API. Throws an Error carrying the server's message on failure. */
export async function api<T = unknown>(
	url: string,
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
	body?: unknown
): Promise<T> {
	const res = await fetch(url, {
		method,
		headers: body === undefined ? undefined : { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	if (!res.ok) {
		const message = (await res.json().catch(() => null))?.message;
		throw new Error(message ?? 'Request failed.');
	}
	return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
