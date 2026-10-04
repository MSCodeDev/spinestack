import { describe, expect, it } from 'vitest';
import { resultToDraft } from './draft';

describe('resultToDraft', () => {
	it('maps provider fields to form fields and defaults to owned', () => {
		const draft = resultToDraft({
			source: 'openlibrary',
			title: 'Dune',
			subtitle: null,
			authors: ['Frank Herbert'],
			publisher: 'Ace',
			isbn: '9780441172719',
			pageCount: 412,
			synopsis: 'Spice',
			language: 'en',
			coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
			year: 1965
		});
		expect(draft).toMatchObject({
			title: 'Dune',
			authors: ['Frank Herbert'],
			isbn: '9780441172719',
			coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
			status: 'owned'
		});
		expect(draft).not.toHaveProperty('year');
	});
});
