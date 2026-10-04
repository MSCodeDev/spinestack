import type { MetadataResult } from '../../types.js';
import type { Http } from './http.js';
import type { SearchQuery } from './index.js';
import {
	asArray,
	asInt,
	asObject,
	asString,
	cleanText,
	languageCode,
	pickIsbn,
	strings,
	yearOf
} from './util.js';

const BASE = 'https://www.googleapis.com/books/v1/volumes';

/** Thumbnail URLs are http and curled by default; ask for the flat, larger image over https. */
function coverUrl(links: unknown): string | null {
	const raw = asString(asObject(links).thumbnail) ?? asString(asObject(links).smallThumbnail);
	if (!raw) return null;
	try {
		const url = new URL(raw);
		url.protocol = 'https:';
		url.searchParams.delete('edge');
		url.searchParams.set('zoom', '2');
		return url.toString();
	} catch {
		return null;
	}
}

function toResult(item: unknown): MetadataResult | null {
	const info = asObject(asObject(item).volumeInfo);
	const title = asString(info.title);
	if (!title) return null;

	const ids = asArray(info.industryIdentifiers).map((i) => asString(asObject(i).identifier));
	return {
		source: 'googlebooks',
		title,
		subtitle: asString(info.subtitle),
		authors: strings(info.authors),
		publisher: asString(info.publisher),
		isbn: pickIsbn(ids.filter((v): v is string => v !== null)),
		pageCount: asInt(info.pageCount),
		synopsis: cleanText(asString(info.description)),
		language: languageCode(asString(info.language)),
		coverUrl: coverUrl(info.imageLinks),
		year: yearOf(asString(info.publishedDate))
	};
}

/** Google Books rejects keyless requests (shared quota is zero), so a key is required. */
async function query(http: Http, q: string, key: string, max: number) {
	const params = new URLSearchParams({ q, maxResults: String(max), printType: 'books', key });
	const data = asObject(await http.json(`${BASE}?${params}`));
	return asArray(data.items)
		.map(toResult)
		.filter((r): r is MetadataResult => r !== null);
}

export async function lookupIsbn(
	http: Http,
	isbn: string,
	key: string
): Promise<MetadataResult | null> {
	const [first] = await query(http, `isbn:${isbn}`, key, 1);
	return first ? { ...first, isbn: first.isbn ?? isbn } : null;
}

export function search(
	http: Http,
	{ title, author, q, limit = 12 }: SearchQuery & { limit?: number },
	key: string
) {
	const text =
		q ?? [`intitle:${title}`, author ? `inauthor:${author}` : ''].filter(Boolean).join(' ');
	return query(http, text, key, limit);
}
