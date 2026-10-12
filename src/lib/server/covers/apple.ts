import type { CoverCandidate } from '../../types.js';
import type { Http } from '../metadata/http.js';
import { asArray, asObject, asString } from '../metadata/util.js';

const BASE = 'https://itunes.apple.com';
const SIZE = 1200;

/** Results carry a 100px thumbnail URL; the same path serves larger renditions. */
const upsize = (url: string) => url.replace(/\/\d+x\d+bb\.(jpg|png)$/, `/${SIZE}x${SIZE}bb.$1`);

function toCandidates(data: unknown): CoverCandidate[] {
	return asArray(asObject(data).results).flatMap((item): CoverCandidate[] => {
		const r = asObject(item);
		const art = asString(r.artworkUrl100);
		const title = asString(r.trackName);
		if (!art || !title) return [];
		return [
			{
				url: upsize(art),
				label: [title, asString(r.artistName)].filter(Boolean).join(' – '),
				source: 'apple'
			}
		];
	});
}

/** Apple Books covers by title and author. No key needed. */
export async function searchCovers(http: Http, q: string, limit = 8) {
	const params = new URLSearchParams({ term: q, entity: 'ebook', limit: String(limit) });
	return toCandidates(await http.json(`${BASE}/search?${params}`));
}

/** The ebook edition with exactly this ISBN, when Apple has it. */
export async function isbnCovers(http: Http, isbn: string) {
	const params = new URLSearchParams({ isbn, entity: 'ebook' });
	return toCandidates(await http.json(`${BASE}/lookup?${params}`));
}
