import { error, json } from '@sveltejs/kit';
import { isbnCovers, searchCovers } from '#lib/server/covers/apple.js';
import { toIsbn13 } from '#lib/isbn.js';
import { requireLibrary } from '#lib/server/guard.js';
import { HttpError } from '#lib/server/metadata/http.js';
import { ProviderError } from '#lib/server/metadata/index.js';
import { http, metadata } from '#lib/server/metadata/index.server.js';
import type { CoverCandidate } from '#lib/types.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	requireLibrary(locals);

	const q = url.searchParams.get('q')?.trim() ?? '';
	const isbn = toIsbn13(url.searchParams.get('isbn') ?? '');
	if (q.length < 2 && !isbn) error(400, 'Enter a title to search for');

	// Listed in this order; each source may fail without losing the others.
	const sources: Promise<CoverCandidate[]>[] = [];
	if (isbn) sources.push(isbnCovers(http, isbn));
	if (q.length >= 2) {
		sources.push(
			metadata.search({ q }).then((results) =>
				results.flatMap((r) =>
					r.coverUrl
						? [
								{
									url: r.coverUrl,
									label: [r.title, r.authors[0]].filter(Boolean).join(' – '),
									source: r.source
								}
							]
						: []
				)
			)
		);
		sources.push(searchCovers(http, q));
	}
	// The exact edition's cover; it may not exist, which the picker tolerates.
	if (isbn) {
		sources.push(
			Promise.resolve([
				{
					url: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
					label: `ISBN ${isbn}`,
					source: 'openlibrary' as const
				}
			])
		);
	}

	const candidates: CoverCandidate[] = [];
	const seen = new Set<string>();
	const failures: unknown[] = [];
	for (const result of await Promise.allSettled(sources)) {
		if (result.status === 'rejected') {
			failures.push(result.reason);
			continue;
		}
		for (const candidate of result.value) {
			if (!seen.has(candidate.url)) {
				seen.add(candidate.url);
				candidates.push(candidate);
			}
		}
	}

	if (!candidates.length && failures.length) {
		const e = failures[0];
		error(
			e instanceof ProviderError || e instanceof HttpError ? 502 : 500,
			e instanceof Error ? e.message : 'Search failed'
		);
	}

	return json({ candidates });
};
