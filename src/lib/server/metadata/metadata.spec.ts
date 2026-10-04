import { describe, expect, it } from 'vitest';
import { createHttp } from './http.js';
import { createMetadata, mergeLists, ProviderError } from './index.js';
import type { Http } from './http.js';
import type { MetadataResult } from '../../types.js';

/** Fake HTTP: the first route whose key is contained in the URL answers; Error values reject. */
const fakeHttp = (routes: Record<string, unknown>): Http & { urls: string[] } => {
	const urls: string[] = [];
	return {
		urls,
		async json(url) {
			urls.push(url);
			const key = Object.keys(routes).find((k) => url.includes(k));
			const value = key === undefined ? new Error(`unrouted ${url}`) : routes[key];
			if (value instanceof Error) throw value;
			return value;
		}
	};
};

const dataResponse = {
	'ISBN:9780441172719': {
		title: 'Dune',
		subtitle: null,
		authors: [{ name: 'Frank Herbert', url: 'x' }],
		number_of_pages: 896,
		publishers: [{ name: 'Ace' }],
		publish_date: 'March 2020',
		cover: { large: 'https://covers.openlibrary.org/b/id/1-L.jpg' }
	}
};
const edition = {
	works: [{ key: '/works/OL893414W' }],
	languages: [{ key: '/languages/eng' }],
	number_of_pages: 535
};
const work = { description: { type: '/type/text', value: 'Spice.\r\n----------\r\n[Source](x)' } };

const searchResponse = {
	docs: [
		{
			title: 'Dune',
			author_name: ['Frank Herbert'],
			publisher: ['Ace'],
			isbn: ['9788576574941', '0441172717', '9780441172719'],
			cover_i: 42,
			number_of_pages_median: 412,
			language: ['eng'],
			first_publish_year: 1965
		},
		{ author_name: ['no title'] }
	]
};

const googleResponse = {
	items: [
		{
			volumeInfo: {
				title: 'Dune',
				subtitle: 'Book One',
				authors: ['Frank Herbert'],
				publisher: 'Penguin',
				publishedDate: '2005-08-02',
				description: 'A much longer description of the desert planet and its spice.',
				industryIdentifiers: [
					{ type: 'ISBN_10', identifier: '0441172717' },
					{ type: 'ISBN_13', identifier: '9780441172719' }
				],
				pageCount: 528,
				language: 'en',
				imageLinks: {
					thumbnail: 'http://books.google.com/books/content?id=XX&zoom=1&edge=curl&source=gbs_api'
				}
			}
		}
	]
};

describe('open library', () => {
	it('looks up an ISBN, adding description and language from the edition and work', async () => {
		const http = fakeHttp({
			'api/books': dataResponse,
			'/isbn/9780441172719.json': edition,
			'/works/OL893414W.json': work
		});
		const result = await createMetadata({ http }).lookupByIsbn('9780441172719');
		expect(result).toEqual({
			source: 'openlibrary',
			title: 'Dune',
			subtitle: null,
			authors: ['Frank Herbert'],
			publisher: 'Ace',
			isbn: '9780441172719',
			pageCount: 896,
			synopsis: 'Spice.',
			language: 'en',
			coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
			year: 2020
		});
	});

	it('returns null for an unknown ISBN and tolerates a missing edition record', async () => {
		const unknown = fakeHttp({ 'api/books': {} });
		expect(await createMetadata({ http: unknown }).lookupByIsbn('9780441172719')).toBeNull();

		const noEdition = fakeHttp({ 'api/books': dataResponse, '/isbn/': new Error('404') });
		const result = await createMetadata({ http: noEdition }).lookupByIsbn('9780441172719');
		expect(result).toMatchObject({ title: 'Dune', synopsis: null, language: null });
	});

	it('maps search results, preferring an English ISBN-13 and skipping untitled docs', async () => {
		const http = fakeHttp({ 'search.json': searchResponse });
		const results = await createMetadata({ http }).search({ title: 'dune' });
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			isbn: '9780441172719',
			coverUrl: 'https://covers.openlibrary.org/b/id/42-L.jpg',
			language: 'en',
			pageCount: 412
		});
		expect(http.urls[0]).toContain('title=dune');
	});
});

describe('google books', () => {
	it('is skipped without an API key', async () => {
		const http = fakeHttp({ 'api/books': dataResponse, '/isbn/': edition, '/works/': work });
		await createMetadata({ http }).lookupByIsbn('9780441172719');
		expect(http.urls.some((u) => u.includes('googleapis'))).toBe(false);
	});

	it('fills gaps from Google Books when a key is set', async () => {
		const http = fakeHttp({
			'api/books': { 'ISBN:9780441172719': { title: 'Dune' } },
			'/isbn/': new Error('404'),
			googleapis: googleResponse
		});
		const result = await createMetadata({ http, googleBooksKey: 'k' }).lookupByIsbn(
			'9780441172719'
		);
		expect(result).toMatchObject({
			source: 'openlibrary',
			title: 'Dune',
			subtitle: 'Book One',
			publisher: 'Penguin',
			pageCount: 528,
			synopsis: expect.stringContaining('desert planet'),
			coverUrl: 'https://books.google.com/books/content?id=XX&zoom=2&source=gbs_api'
		});
		expect(http.urls.find((u) => u.includes('googleapis'))).toContain('key=k');
	});

	it('survives one provider failing but not all', async () => {
		const oneDown = fakeHttp({ 'api/books': new Error('down'), googleapis: googleResponse });
		const result = await createMetadata({ http: oneDown, googleBooksKey: 'k' }).lookupByIsbn(
			'9780441172719'
		);
		expect(result?.source).toBe('googlebooks');

		const allDown = fakeHttp({ 'api/books': new Error('down') });
		await expect(createMetadata({ http: allDown }).lookupByIsbn('9780441172719')).rejects.toThrow(
			ProviderError
		);
	});
});

describe('mergeLists', () => {
	const r = (over: Partial<MetadataResult>): MetadataResult => ({
		source: 'openlibrary',
		title: 'T',
		subtitle: null,
		authors: ['A'],
		publisher: null,
		isbn: null,
		pageCount: null,
		synopsis: null,
		language: null,
		coverUrl: null,
		year: null,
		...over
	});

	it('merges the same book across providers by ISBN or title and author', () => {
		const merged = mergeLists([
			[r({ title: 'Dune', isbn: '9780441172719' }), r({ title: 'Emma', authors: ['Jane Austen'] })],
			[
				r({ source: 'googlebooks', title: 'Dune!', isbn: '9780441172719', pageCount: 5 }),
				r({ source: 'googlebooks', title: 'EMMA', authors: ['jane austen'], publisher: 'P' })
			]
		]);
		expect(merged).toHaveLength(2);
		expect(merged[0]).toMatchObject({ title: 'Dune', pageCount: 5 });
		expect(merged[1]).toMatchObject({ title: 'Emma', publisher: 'P' });
	});

	it('lists results with covers first and caps the length', () => {
		const list = [
			r({ title: 'A', authors: ['x'] }),
			r({ title: 'B', authors: ['y'], coverUrl: 'c' })
		];
		expect(mergeLists([list]).map((x) => x.title)).toEqual(['B', 'A']);
		expect(mergeLists([list], 1)).toHaveLength(1);
	});
});

describe('createHttp', () => {
	it('caches successful responses and rejects failures', async () => {
		let calls = 0;
		const fetchFn = (async (url: string) => {
			calls++;
			return url.includes('bad') ? new Response('', { status: 500 }) : Response.json({ ok: calls });
		}) as unknown as typeof fetch;
		const http = createHttp({ fetchFn });

		expect(await http.json('https://x.org/a')).toEqual({ ok: 1 });
		expect(await http.json('https://x.org/a')).toEqual({ ok: 1 });
		expect(calls).toBe(1);
		await expect(http.json('https://x.org/bad')).rejects.toThrow(/500/);
	});
});
