import { FIELD_SEARCHES, type FieldSearchParam } from '../../library/query.js';

const terms = (text: string) => text.match(/[\p{L}\p{N}]+/gu)?.map((t) => `"${t}"*`) ?? [];

/**
 * FTS5 MATCH expression: every word is a quoted prefix term, AND-ed together.
 * Field searches are limited to their own FTS column.
 */
export function buildMatch(
	q: string,
	fields: Partial<Record<FieldSearchParam, string>> = {}
): string | null {
	const parts = terms(q);
	for (const [param, column] of Object.entries(FIELD_SEARCHES)) {
		const fieldTerms = terms(fields[param as FieldSearchParam] ?? '');
		if (fieldTerms.length) parts.push(`${column} : (${fieldTerms.join(' ')})`);
	}
	return parts.length ? parts.join(' ') : null;
}
