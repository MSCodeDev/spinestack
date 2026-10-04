import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/forms', () => ({ deserialize: vi.fn() }));
vi.mock('#lib/modal-url.js', () => ({ actionHref: (n: string) => `?/${n}` }));

import { draftToFormData } from './save-book';

describe('draftToFormData', () => {
	it('maps a draft to the add form fields', () => {
		const form = draftToFormData({
			title: 'Dune',
			authors: ['Frank Herbert', 'Brian Herbert'],
			isbn: '9780441172719',
			pageCount: 412,
			subtitle: null,
			coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg'
		});
		expect(form.get('title')).toBe('Dune');
		expect(form.getAll('author')).toEqual(['Frank Herbert', 'Brian Herbert']);
		expect(form.get('pageCount')).toBe('412');
		expect(form.get('subtitle')).toBe('');
		expect(form.get('publisher')).toBe('');
		expect(form.get('status')).toBe('owned');
		expect(form.get('coverUrl')).toContain('openlibrary');
	});
});
