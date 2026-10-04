import type { MetadataResult } from '../../types.js';
import type { Http } from './http.js';
import * as googleBooks from './googlebooks.js';
import * as openLibrary from './openlibrary.js';

export class ProviderError extends Error {}

/** Either a title (with optional author) or free text. */
export type SearchQuery = { title?: string; author?: string; q?: string };

type Deps = { http: Http; googleBooksKey?: string };

const norm = (s: string | null | undefined) =>
	(s ?? '')
		.normalize('NFKD')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.toLowerCase();

const titleKey = (r: MetadataResult) => `${norm(r.title)}|${norm(r.authors[0])}`;

/** Keep `a`'s fields and fill the gaps from `b`; the longer synopsis wins. */
export function merge(a: MetadataResult, b: MetadataResult): MetadataResult {
	const longer = (x: string | null, y: string | null) =>
		(y?.length ?? 0) > (x?.length ?? 0) ? y : x;
	return {
		source: a.source,
		title: a.title,
		subtitle: a.subtitle ?? b.subtitle,
		authors: a.authors.length ? a.authors : b.authors,
		publisher: a.publisher ?? b.publisher,
		isbn: a.isbn ?? b.isbn,
		pageCount: a.pageCount ?? b.pageCount,
		synopsis: longer(a.synopsis, b.synopsis),
		language: a.language ?? b.language,
		coverUrl: a.coverUrl ?? b.coverUrl,
		year: a.year ?? b.year
	};
}

/** Combine result lists, merging entries that are the same book (same ISBN, or same title and author). */
export function mergeLists(lists: MetadataResult[][], limit = 20): MetadataResult[] {
	const out: MetadataResult[] = [];
	const byIsbn = new Map<string, number>();
	const byTitle = new Map<string, number>();

	for (const result of lists.flat()) {
		const known =
			(result.isbn ? byIsbn.get(result.isbn) : undefined) ?? byTitle.get(titleKey(result));

		let index: number;
		if (known !== undefined) {
			out[known] = merge(out[known], result);
			index = known;
		} else {
			out.push(result);
			index = out.length - 1;
			byTitle.set(titleKey(result), index);
		}

		const isbn = out[index].isbn;
		if (isbn) byIsbn.set(isbn, index);
	}

	// Results with a cover are the most useful to pick from.
	return out
		.map((r, i) => ({ r, i }))
		.sort((x, y) => Number(!!y.r.coverUrl) - Number(!!x.r.coverUrl) || x.i - y.i)
		.map(({ r }) => r)
		.slice(0, limit);
}

export function createMetadata({ http, googleBooksKey }: Deps) {
	/** Run each provider; fail only when every one of them failed. */
	async function fanOut<T>(tasks: Promise<T>[]): Promise<T[]> {
		const values: T[] = [];
		for (const result of await Promise.allSettled(tasks)) {
			if (result.status === 'fulfilled') values.push(result.value as T);
		}
		if (!values.length) throw new ProviderError('Book lookup services are unavailable right now.');
		return values;
	}

	return {
		/** Look up one ISBN-13 across providers. Null when none know it. */
		async lookupByIsbn(isbn: string): Promise<MetadataResult | null> {
			const tasks = [openLibrary.lookupIsbn(http, isbn)];
			if (googleBooksKey) tasks.push(googleBooks.lookupIsbn(http, isbn, googleBooksKey));
			const found = (await fanOut(tasks)).filter((r): r is MetadataResult => r !== null);
			return found.reduce<MetadataResult | null>((acc, r) => (acc ? merge(acc, r) : r), null);
		},

		async search(query: SearchQuery): Promise<MetadataResult[]> {
			const tasks = [openLibrary.search(http, query)];
			if (googleBooksKey) tasks.push(googleBooks.search(http, query, googleBooksKey));
			return mergeLists(await fanOut(tasks));
		}
	};
}
