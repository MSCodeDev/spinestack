import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DownloadError, downloadImage, isAllowedImageUrl } from './download.js';
import { InvalidImageError, createCoverStore } from './store.js';

let dir: string;
beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'covers-'));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const image = (width: number, height: number, background = '#ff0000') =>
	sharp({ create: { width, height, channels: 3, background } })
		.png()
		.toBuffer();

describe('cover store', () => {
	it('writes full and thumbnail sizes and reports the dominant colour', async () => {
		const store = createCoverStore(dir);
		const { color } = await store.save('b1', await image(2000, 3000));
		// sharp quantises the dominant colour, so check it is clearly red
		expect(color).toMatch(/^#[0-9a-f]{6}$/);
		const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
		expect(r).toBeGreaterThan(0xe0);
		expect(g + b).toBeLessThan(0x40);

		const full = await sharp(store.file('b1', 'full')).metadata();
		expect(full).toMatchObject({ format: 'jpeg', width: 683, height: 1024 });
		expect((await sharp(store.file('b1', '256')).metadata()).width).toBe(256);
		expect((await sharp(store.file('b1', '512')).metadata()).width).toBe(512);
	});

	it('does not upscale small covers', async () => {
		const store = createCoverStore(dir);
		await store.save('b1', await image(100, 150));
		expect((await sharp(store.file('b1', 'full')).metadata()).width).toBe(100);
		expect((await sharp(store.file('b1', '256')).metadata()).width).toBe(100);
	});

	it('rejects non-images and placeholder-sized images', async () => {
		const store = createCoverStore(dir);
		await expect(store.save('b1', Buffer.from('not an image'))).rejects.toThrow(InvalidImageError);
		await expect(store.save('b1', await image(1, 1))).rejects.toThrow(/too small/);
	});

	it('removes and reads files', async () => {
		const store = createCoverStore(dir);
		await store.save('b1', await image(200, 300));
		expect(await store.read('b1', '256')).not.toBeNull();
		await store.remove('b1');
		expect(await store.read('b1', '256')).toBeNull();
		await expect(store.remove('b1')).resolves.toBeUndefined();
	});
});

describe('isAllowedImageUrl', () => {
	it('allows https cover hosts and subdomains', () => {
		expect(isAllowedImageUrl('https://covers.openlibrary.org/b/id/1-L.jpg')).toBe(true);
		expect(isAllowedImageUrl('https://ia800000.us.archive.org/x.jpg')).toBe(true);
		expect(isAllowedImageUrl('https://books.google.com/books/content?id=1')).toBe(true);
		expect(isAllowedImageUrl('https://lh3.googleusercontent.com/abc')).toBe(true);
	});

	it('rejects other hosts, schemes and tricks', () => {
		expect(isAllowedImageUrl('http://covers.openlibrary.org/x.jpg')).toBe(false);
		expect(isAllowedImageUrl('https://evil.com/x.jpg')).toBe(false);
		expect(isAllowedImageUrl('https://covers.openlibrary.org.evil.com/x.jpg')).toBe(false);
		expect(isAllowedImageUrl('https://notarchive.org/x.jpg')).toBe(false);
		expect(isAllowedImageUrl('https://user:pw@covers.openlibrary.org/x.jpg')).toBe(false);
		expect(isAllowedImageUrl('https://127.0.0.1/x.jpg')).toBe(false);
		expect(isAllowedImageUrl('file:///etc/passwd')).toBe(false);
		expect(isAllowedImageUrl('nonsense')).toBe(false);
	});
});

describe('downloadImage', () => {
	const respond = (body: BodyInit, init: ResponseInit = {}) =>
		new Response(body, { headers: { 'content-type': 'image/jpeg', ...init.headers }, ...init });

	it('downloads an image', async () => {
		const fetchFn = (async () => respond(new Uint8Array([1, 2, 3]))) as typeof fetch;
		const buf = await downloadImage('https://covers.openlibrary.org/a.jpg', { fetchFn });
		expect([...buf]).toEqual([1, 2, 3]);
	});

	it('follows redirects between allowed hosts only', async () => {
		const calls: string[] = [];
		const fetchFn = (async (url: string) => {
			calls.push(url);
			if (url.includes('covers.openlibrary.org')) {
				return new Response(null, {
					status: 302,
					headers: { location: 'https://ia800.us.archive.org/a.jpg' }
				});
			}
			return respond(new Uint8Array([9]));
		}) as unknown as typeof fetch;
		await downloadImage('https://covers.openlibrary.org/a.jpg', { fetchFn });
		expect(calls).toHaveLength(2);

		const evil = (async () =>
			new Response(null, {
				status: 302,
				headers: { location: 'https://evil.com/x' }
			})) as unknown as typeof fetch;
		await expect(
			downloadImage('https://covers.openlibrary.org/a.jpg', { fetchFn: evil })
		).rejects.toThrow(DownloadError);
	});

	it('rejects non-images, errors and oversized bodies', async () => {
		const url = 'https://covers.openlibrary.org/a.jpg';
		const html = (async () =>
			respond('<html>', { headers: { 'content-type': 'text/html' } })) as typeof fetch;
		await expect(downloadImage(url, { fetchFn: html })).rejects.toThrow(/not an image/);

		const missing = (async () => respond('', { status: 404 })) as typeof fetch;
		await expect(downloadImage(url, { fetchFn: missing })).rejects.toThrow(/404/);

		const big = (async () => respond(new Uint8Array(100))) as typeof fetch;
		await expect(downloadImage(url, { fetchFn: big, maxBytes: 50 })).rejects.toThrow(/too large/);
	});
});
