import { error, json } from '@sveltejs/kit';
import { toIsbn13 } from '#lib/isbn.js';
import { requireLibrary } from '#lib/server/guard.js';
import { ProviderError } from '#lib/server/metadata/index.js';
import { metadata } from '#lib/server/metadata/index.server.js';
import type { CoverCandidate } from '#lib/types.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	requireLibrary(locals);

	const q = url.searchParams.get('q')?.trim() ?? '';
	const isbn = toIsbn13(url.searchParams.get('isbn') ?? '');
	if (q.length < 2 && !isbn) error(400, 'Enter a title to search for');

	const candidates: CoverCandidate[] = [];
	const seen = new Set<string>();
	const add = (candidate: CoverCandidate) => {
		if (!seen.has(candidate.url)) {
			seen.add(candidate.url);
			candidates.push(candidate);
		}
	};

	// The exact edition's cover first; it may not exist, which the picker tolerates.
	if (isbn) {
		add({
			url: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
			label: `ISBN ${isbn}`,
			source: 'openlibrary'
		});
	}

	if (q.length >= 2) {
		try {
			for (const r of await metadata.search({ q })) {
				if (r.coverUrl) {
					add({
						url: r.coverUrl,
						label: [r.title, r.authors[0]].filter(Boolean).join(' – '),
						source: r.source
					});
				}
			}
		} catch (e) {
			if (!(e instanceof ProviderError) || !candidates.length) {
				error(
					e instanceof ProviderError ? 502 : 500,
					e instanceof Error ? e.message : 'Search failed'
				);
			}
		}
	}

	return json({ candidates });
};
