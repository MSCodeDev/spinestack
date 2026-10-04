import { error, json } from '@sveltejs/kit';
import { toIsbn13 } from '#lib/isbn.js';
import { db } from '#lib/server/db/index.js';
import { requireLibrary } from '#lib/server/guard.js';
import { findExistingIsbns } from '#lib/server/library/books.js';
import { ProviderError } from '#lib/server/metadata/index.js';
import { metadata } from '#lib/server/metadata/index.server.js';
import type { LookupResult, MetadataResult } from '#lib/types.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const { libraryId } = requireLibrary(locals);

	const rawIsbn = url.searchParams.get('isbn');
	const title = url.searchParams.get('title')?.trim() ?? '';
	const author = url.searchParams.get('author')?.trim() || undefined;

	let results: MetadataResult[];
	try {
		if (rawIsbn !== null) {
			const isbn = toIsbn13(rawIsbn);
			if (!isbn) error(400, 'Invalid ISBN');
			const found = await metadata.lookupByIsbn(isbn);
			results = found ? [found] : [];
		} else if (title.length >= 2) {
			results = await metadata.search({ title, author });
		} else {
			error(400, 'Enter a title or an ISBN');
		}
	} catch (e) {
		if (e instanceof ProviderError) error(502, e.message);
		throw e;
	}

	const existing = findExistingIsbns(
		db,
		libraryId,
		results.flatMap((r) => (r.isbn ? [r.isbn] : []))
	);
	const withExisting: LookupResult[] = results.map((r) => ({
		...r,
		existingId: (r.isbn && existing.get(r.isbn)) || null
	}));
	return json({ results: withExisting });
};
