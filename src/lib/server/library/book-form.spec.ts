import { describe, expect, it } from 'vitest';
import { parseBookForm } from './book-form.js';

const form = (entries: [string, string][]) => {
	const f = new FormData();
	for (const [k, v] of entries) f.append(k, v);
	return f;
};

describe('parseBookForm', () => {
	it('requires a title', () => {
		expect(parseBookForm(form([['title', '  ']])).error).toMatch(/title/i);
	});

	it('normalises ISBN, lists and prices', () => {
		const { input } = parseBookForm(
			form([
				['title', 'Dune'],
				['isbn', '0-306-40615-2'],
				['author', 'Frank Herbert'],
				['author', ' frank herbert '],
				['author', ''],
				['tag', 'scifi'],
				['currency', 'usd'],
				['paidPrice', '7.50'],
				['status', 'wishlist'],
				['boughtAt', '2024-02-30x']
			])
		);
		expect(input).toMatchObject({
			isbn: '9780306406157',
			authors: ['Frank Herbert'],
			tags: ['scifi'],
			currency: 'USD',
			paidPrice: 750,
			status: 'wishlist',
			boughtAt: null
		});
	});

	it('rejects bad ISBN, page count and prices without currency', () => {
		expect(
			parseBookForm(
				form([
					['title', 'x'],
					['isbn', '123']
				])
			).error
		).toMatch(/ISBN/);
		expect(
			parseBookForm(
				form([
					['title', 'x'],
					['pageCount', '1.5']
				])
			).error
		).toMatch(/Page/);
		expect(
			parseBookForm(
				form([
					['title', 'x'],
					['paidPrice', '5']
				])
			).error
		).toMatch(/currency/);
	});
});
