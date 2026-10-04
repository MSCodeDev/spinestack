export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_HOSTS = [
	'covers.openlibrary.org',
	'openlibrary.org',
	'archive.org',
	'books.google.com',
	'googleusercontent.com'
];

export class DownloadError extends Error {}

/** https URLs on known cover hosts (or their subdomains) only. */
export function isAllowedImageUrl(value: string): boolean {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return false;
	}
	if (url.protocol !== 'https:' || url.username || url.password) return false;
	const host = url.hostname.toLowerCase();
	return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

type Options = { fetchFn?: typeof fetch; maxBytes?: number; timeoutMs?: number };

/** Download an image from an allowed host, following redirects only to allowed hosts. */
export async function downloadImage(
	value: string,
	{ fetchFn = fetch, maxBytes = MAX_IMAGE_BYTES, timeoutMs = 10_000 }: Options = {}
): Promise<Buffer> {
	let current = value;

	for (let hops = 0; hops <= 3; hops++) {
		if (!isAllowedImageUrl(current)) throw new DownloadError('Image host is not allowed.');

		const res = await fetchFn(current, {
			redirect: 'manual',
			signal: AbortSignal.timeout(timeoutMs),
			headers: { 'user-agent': 'SpineStack' }
		});

		if (res.status >= 300 && res.status < 400) {
			const location = res.headers.get('location');
			if (!location) throw new DownloadError('Bad redirect.');
			current = new URL(location, current).toString();
			continue;
		}
		if (!res.ok) throw new DownloadError(`Image request failed (${res.status}).`);
		if (!res.headers.get('content-type')?.startsWith('image/')) {
			throw new DownloadError('Response is not an image.');
		}
		if (Number(res.headers.get('content-length')) > maxBytes) {
			throw new DownloadError('Image is too large.');
		}

		const chunks: Uint8Array[] = [];
		let size = 0;
		for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
			size += chunk.byteLength;
			if (size > maxBytes) throw new DownloadError('Image is too large.');
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	}

	throw new DownloadError('Too many redirects.');
}
