/** FTS5 MATCH expression: every word is a quoted prefix term, AND-ed together. */
export function buildMatch(q: string): string | null {
	const terms = q.match(/[\p{L}\p{N}]+/gu);
	return terms ? terms.map((t) => `"${t}"*`).join(' ') : null;
}
