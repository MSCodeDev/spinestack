import { describe, expect, it } from 'vitest';
import { DEFAULT_QUERY, parseQuery, serializeQuery } from './query';

const parse = (qs: string) => parseQuery(new URLSearchParams(qs));

describe('library query', () => {
	it('uses defaults for empty or invalid params', () => {
		expect(parse('')).toEqual(DEFAULT_QUERY);
		expect(parse('sort=nope:up&view=grid')).toEqual(DEFAULT_QUERY);
	});

	it('picks a sensible default direction per field', () => {
		expect(parse('sort=title').dir).toBe('asc');
		expect(parse('sort=pages').dir).toBe('desc');
	});

	it('round-trips through the URL', () => {
		const query = { q: 'dune', sort: 'title', dir: 'desc', view: 'table' } as const;
		expect(parseQuery(serializeQuery(query))).toEqual(query);
	});

	it('omits defaults when serialising', () => {
		expect(serializeQuery(DEFAULT_QUERY).toString()).toBe('');
		expect(serializeQuery({ ...DEFAULT_QUERY, sort: 'title', dir: 'asc' }).toString()).toBe(
			'sort=title%3Aasc'
		);
	});
});
