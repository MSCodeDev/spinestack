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
