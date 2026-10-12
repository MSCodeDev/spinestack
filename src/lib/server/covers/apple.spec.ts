import { describe, expect, it } from 'vitest';
import type { Http } from '../metadata/http.js';
import { isbnCovers, searchCovers } from './apple.js';

const reply = {
	results: [
		{
			trackName: 'Project Hail Mary',
			artistName: 'Andy Weir',
			artworkUrl100:
				'https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/13/fb/x/9780593135211.d.jpg/100x100bb.jpg'
		},
		{ trackName: 'No art', artistName: 'Nobody' },
		{ artworkUrl100: 'https://is1-ssl.mzstatic.com/a/100x100bb.png' }
	]
};

const fake = () => {
	const urls: string[] = [];
	const http = {
		async json(url: string) {
			urls.push(url);
			return reply;
		}
	} as Http;
	return { http, urls };
};

describe('apple books covers', () => {
	it('asks for a large rendition and skips results without art or a title', async () => {
		const { http, urls } = fake();
		expect(await searchCovers(http, 'hail mary weir')).toEqual([
			{
				url: 'https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/13/fb/x/9780593135211.d.jpg/1200x1200bb.jpg',
				label: 'Project Hail Mary – Andy Weir',
				source: 'apple'
			}
		]);
		expect(urls[0]).toContain('entity=ebook');
		expect(urls[0]).toContain('term=hail+mary+weir');
	});

	it('looks up by ISBN', async () => {
		const { http, urls } = fake();
		expect(await isbnCovers(http, '9780593135211')).toHaveLength(1);
		expect(urls[0]).toContain('/lookup?isbn=9780593135211');
	});
});
