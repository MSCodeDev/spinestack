import type { MetadataResult } from '../../types.js';
import type { Http } from './http.js';
import type { SearchQuery } from './index.js';
import { asArray, asInt, asObject, asString, cleanText, languageCode, pickIsbn } from './util.js';

const ENDPOINT = 'https://api.hardcover.app/v1/graphql';

const BOOK_FIELDS = `
	title subtitle description pages release_year
	image { url }
	contributions(limit: 4) { contribution author { name } }
	default_physical_edition { isbn_13 pages image { url } publisher { name } language { code2 } }
`;

const SEARCH = `query ($q: String!, $n: Int!) {
	search(query: $q, query_type: "Book", per_page: $n) { ids }
}`;

const BOOKS = `query ($ids: [Int!]!) {
	books(where: { id: { _in: $ids } }) { id ${BOOK_FIELDS} }
}`;

const BY_ISBN = `query ($isbn: String!) {
	editions(where: { isbn_13: { _eq: $isbn } }, limit: 1) {
		title subtitle pages release_year isbn_13
		image { url }
		publisher { name }
		language { code2 }
		book { ${BOOK_FIELDS} }
	}
}`;

/** Tokens are shown with a "Bearer " prefix on the settings page; accept either form. */
const bearer = (token: string) => (/^bearer\s/i.test(token) ? token : `Bearer ${token}`);

async function graphql(http: Http, token: string, query: string, variables: object) {
	const reply = asObject(
		await http.post(ENDPOINT, { query, variables }, { authorization: bearer(token) })
	);
	const [first] = asArray(reply.errors);
	if (first) {
		const message = asString(asObject(first).message) ?? asString(first);
		throw new Error(`Hardcover: ${message ?? 'query failed'}`);
	}
	return asObject(reply.data);
}

const imageUrl = (image: unknown) => asString(asObject(image).url);

/** Authors only; illustrators, translators and so on carry a role name. */
function authorNames(contributions: unknown): string[] {
	return asArray(contributions).flatMap((c) => {
		const role = asString(asObject(c).contribution);
		const name = asString(asObject(asObject(c).author).name);
		return name && (!role || role.toLowerCase() === 'author') ? [name] : [];
	});
}

/** A `books` row, optionally overlaid with details of the exact edition. */
function toResult(book: unknown, edition: Record<string, unknown> = {}): MetadataResult | null {
	const b = asObject(book);
	const title = asString(b.title) ?? asString(edition.title);
	if (!title) return null;

	const physical = asObject(b.default_physical_edition);
	const pick = <T>(...values: (T | null)[]) => values.find((v) => v !== null) ?? null;

	return {
		source: 'hardcover',
		title,
		subtitle: pick(asString(edition.subtitle), asString(b.subtitle)),
		authors: authorNames(b.contributions),
		publisher: pick(
			asString(asObject(edition.publisher).name),
			asString(asObject(physical.publisher).name)
		),
		isbn: pickIsbn(
			[asString(edition.isbn_13), asString(physical.isbn_13)].filter((v): v is string => !!v)
		),
		pageCount: pick(asInt(edition.pages), asInt(b.pages), asInt(physical.pages)),
		synopsis: cleanText(asString(b.description)),
		language: languageCode(
			pick(asString(asObject(edition.language).code2), asString(asObject(physical.language).code2))
		),
		coverUrl: pick(imageUrl(edition.image), imageUrl(b.image), imageUrl(physical.image)),
		year: pick(asInt(edition.release_year), asInt(b.release_year))
	};
}

export async function lookupIsbn(
	http: Http,
	isbn: string,
	token: string
): Promise<MetadataResult | null> {
	const data = await graphql(http, token, BY_ISBN, { isbn });
	const edition = asObject(asArray(data.editions)[0]);
	const result = toResult(edition.book, edition);
	return result ? { ...result, isbn: result.isbn ?? isbn } : null;
}

export async function search(
	http: Http,
	{ title, author, q, limit = 12 }: SearchQuery & { limit?: number },
	token: string
): Promise<MetadataResult[]> {
	const text = q ?? [title, author].filter(Boolean).join(' ');
	if (!text) return [];

	const found = await graphql(http, token, SEARCH, { q: text, n: limit });
	const ids = asArray(asObject(found.search).ids)
		.map(Number)
		.filter((id) => Number.isInteger(id));
	if (!ids.length) return [];

	const data = await graphql(http, token, BOOKS, { ids });
	// The `in` query loses the search ranking, so restore it.
	const rank = new Map(ids.map((id, i) => [id, i]));
	return asArray(data.books)
		.map(asObject)
		.sort((a, b) => (rank.get(Number(a.id)) ?? 0) - (rank.get(Number(b.id)) ?? 0))
		.map((book) => toResult(book))
		.filter((r): r is MetadataResult => r !== null);
}
