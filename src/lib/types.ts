export type BookStatus = 'owned' | 'wishlist';

/** Editable book fields; related entities are referenced by name and created on demand. */
export type BookInput = {
	title: string;
	subtitle: string | null;
	authors: string[];
	isbn: string | null;
	publisher: string | null;
	series: string | null;
	seriesNumber: string | null;
	location: string | null;
	tags: string[];
	status: BookStatus;
	pageCount: number | null;
	language: string | null;
	synopsis: string | null;
	notes: string | null;
	currency: string | null;
	labelPrice: number | null;
	paidPrice: number | null;
	boughtAt: string | null;
	arrivedAt: string | null;
};

export type Reading = { id: string; startedAt: string; finishedAt: string | null };

export type BookDetail = BookInput & {
	id: string;
	coverVersion: number;
	createdAt: number;
	readings: Reading[];
};

export type BookSummary = {
	id: string;
	title: string;
	authors: string[];
	coverVersion: number;
};

export type Options = {
	authors: string[];
	publishers: string[];
	series: string[];
	locations: string[];
	tags: string[];
};
