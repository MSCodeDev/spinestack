import { toIsbn13 } from '../../isbn.js';
import { toMinor } from '../../money.js';
import type { BookInput } from '../../types.js';

type Parsed = { input: BookInput; error?: undefined } | { error: string; input?: undefined };

const text = (form: FormData, key: string) => {
	const v = String(form.get(key) ?? '').trim();
	return v || null;
};

const list = (form: FormData, key: string) => {
	const seen = new Map<string, string>();
	for (const v of form.getAll(key)) {
		const name = String(v).trim();
		if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
	}
	return [...seen.values()];
};

const date = (form: FormData, key: string) => {
	const v = text(form, key);
	return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

export function parseBookForm(form: FormData): Parsed {
	const title = text(form, 'title');
	if (!title) return { error: 'Title is required.' };

	const rawIsbn = text(form, 'isbn');
	const isbn = rawIsbn ? toIsbn13(rawIsbn) : null;
	if (rawIsbn && !isbn) return { error: 'Invalid ISBN.' };

	const pageText = text(form, 'pageCount');
	const pageCount = pageText ? Number(pageText) : null;
	if (pageCount !== null && (!Number.isInteger(pageCount) || pageCount < 0)) {
		return { error: 'Page count must be a whole number.' };
	}

	const currency = text(form, 'currency')?.toUpperCase() ?? null;
	if (currency && !/^[A-Z]{3}$/.test(currency)) return { error: 'Invalid currency code.' };

	const price = (key: string) => {
		const v = text(form, key);
		return v && currency ? toMinor(v, currency) : null;
	};
	const labelPrice = price('labelPrice');
	const paidPrice = price('paidPrice');
	if (
		(text(form, 'labelPrice') && labelPrice === null) ||
		(text(form, 'paidPrice') && paidPrice === null)
	) {
		return { error: 'Enter prices as numbers and pick a currency.' };
	}

	return {
		input: {
			title,
			subtitle: text(form, 'subtitle'),
			authors: list(form, 'author'),
			isbn,
			publisher: text(form, 'publisher'),
			series: text(form, 'series'),
			seriesNumber: text(form, 'seriesNumber'),
			location: text(form, 'location'),
			tags: list(form, 'tag'),
			status: form.get('status') === 'wishlist' ? 'wishlist' : 'owned',
			pageCount,
			language: text(form, 'language'),
			synopsis: text(form, 'synopsis'),
			notes: text(form, 'notes'),
			currency,
			labelPrice,
			paidPrice,
			boughtAt: date(form, 'boughtAt'),
			arrivedAt: date(form, 'arrivedAt')
		}
	};
}
