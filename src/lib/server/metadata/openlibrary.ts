import type { MetadataResult } from '../../types.js';
import type { Http } from './http.js';
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

const BASE = 'https://openlibrary.org';

const text = (value: unknown): string | null => asString(value) ?? asString(asObject(value).value);

const languageOf = (edition: unknown) => {
	const key = asString(asObject(asArray(asObject(edition).languages)[0]).key);
	return languageCode(key?.split('/').pop() ?? null);
};

export async function lookupIsbn(http: Http, isbn: string): Promise<MetadataResult | null> {
	const data = asObject(
		await http.json(`${BASE}/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
	);
	const entry = asObject(data[`ISBN:${isbn}`]);
	const title = asString(entry.title);
	if (!title) return null;

	// The edition record has the description and language that the data API lacks.
	const edition = asObject(await http.json(`${BASE}/isbn/${isbn}.json`).catch(() => null));
	let synopsis = text(edition.description);
	if (!synopsis) {
		const workKey = asString(asObject(asArray(edition.works)[0]).key);
		if (workKey?.startsWith('/works/')) {
			const work = await http.json(`${BASE}${workKey}.json`).catch(() => null);
			synopsis = text(asObject(work).description);
		}
	}

	return {
		source: 'openlibrary',
		title,
		subtitle: asString(entry.subtitle),
		authors: asArray(entry.authors)
			.map((a) => asString(asObject(a).name))
			.filter((n): n is string => n !== null),
		publisher: asString(asObject(asArray(entry.publishers)[0]).name),
		isbn,
		pageCount: asInt(entry.number_of_pages) ?? asInt(edition.number_of_pages),
		synopsis: cleanText(synopsis),
		language: languageOf(edition),
		coverUrl: asString(asObject(entry.cover).large),
		year: yearOf(asString(entry.publish_date))
	};
}

const FIELDS =
	'key,title,subtitle,author_name,publisher,isbn,number_of_pages_median,cover_i,language,first_publish_year';

export async function search(
	http: Http,
	{ title, author, limit = 12 }: { title: string; author?: string; limit?: number }
): Promise<MetadataResult[]> {
	const params = new URLSearchParams({ title, limit: String(limit), fields: FIELDS });
	if (author) params.set('author', author);

	const data = asObject(await http.json(`${BASE}/search.json?${params}`));
	return asArray(data.docs).flatMap((doc): MetadataResult[] => {
		const d = asObject(doc);
		const name = asString(d.title);
		if (!name) return [];
		const cover = asInt(d.cover_i);
		return [
			{
				source: 'openlibrary',
				title: name,
				subtitle: asString(d.subtitle),
				authors: strings(d.author_name),
				publisher: strings(d.publisher)[0] ?? null,
				isbn: pickIsbn(strings(d.isbn)),
				pageCount: asInt(d.number_of_pages_median),
				synopsis: null,
				language: languageCode(strings(d.language)[0] ?? null),
				coverUrl: cover ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg` : null,
				year: asInt(d.first_publish_year)
			}
		];
	});
}
