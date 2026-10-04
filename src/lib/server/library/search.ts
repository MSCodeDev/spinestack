/** FTS5 MATCH expression: every word is a quoted prefix term, AND-ed together. */
export function buildMatch(q: string): string | null {
	const terms = q.match(/[\p{L}\p{N}]+/gu)?.map((t) => `"${t}"*`);
	return terms?.length ? terms.join(' ') : null;
}
