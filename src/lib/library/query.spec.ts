import { describe, expect, it } from 'vitest';
import {
	DEFAULT_QUERY,
	activeFilterCount,
	parseQuery,
	serializeQuery,
	type LibraryQuery
} from './query';

const parse = (qs: string) => parseQuery(new URLSearchParams(qs));

describe('library query', () => {
	it('uses defaults for empty or invalid params', () => {
		expect(parse('')).toEqual(DEFAULT_QUERY);
		expect(parse('sort=nope:up&view=grid&group=x&reading=maybe')).toEqual(DEFAULT_QUERY);
	});

	it('picks a sensible default direction per field', () => {
		expect(parse('sort=title').dir).toBe('asc');
		expect(parse('sort=pages').dir).toBe('desc');
	});

	it('round-trips every param through the URL', () => {
		const query: LibraryQuery = {
			q: 'dune',
			sort: 'title',
			dir: 'desc',
			group: 'author',
			view: 'table',
			reading: 'read',
			price: '5-20.5',
			date: '2024-01..2024-06',
			series: ['Dune', 'Foundation'],
			publisher: ['Ace'],
			location: ['Study – Shelf 2']
		};
		expect(parseQuery(serializeQuery(query))).toEqual(query);
	});

	it('omits defaults when serialising', () => {
		expect(serializeQuery(DEFAULT_QUERY).toString()).toBe('');
		expect(serializeQuery({ ...DEFAULT_QUERY, sort: 'title', dir: 'asc' }).toString()).toBe(
			'sort=title%3Aasc'
		);
	});

	it('uses the preferred default view and only serialises a different one', () => {
		const defaults = { view: 'table' } as const;
		expect(parseQuery(new URLSearchParams(''), defaults).view).toBe('table');
		expect(parseQuery(new URLSearchParams('view=covers'), defaults).view).toBe('covers');
		expect(serializeQuery({ ...DEFAULT_QUERY, view: 'table' }, defaults).toString()).toBe('');
		expect(serializeQuery({ ...DEFAULT_QUERY, view: 'covers' }, defaults).toString()).toBe(
			'view=covers'
		);
	});

	it('dedupes and trims list filters', () => {
		expect(parse('series=a&series=%20a%20&series=&series=b').series).toEqual(['a', 'b']);
	});

	it('counts active filters but not sort, group or view', () => {
		expect(activeFilterCount(DEFAULT_QUERY)).toBe(0);
		expect(activeFilterCount(parse('sort=title&group=author&view=table'))).toBe(0);
		expect(activeFilterCount(parse('reading=read&series=a&series=b&price=5-10&date=2024'))).toBe(5);
		expect(activeFilterCount(parse('q=dune'))).toBe(0);
	});
});
