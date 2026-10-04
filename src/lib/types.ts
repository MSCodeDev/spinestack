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

export type BookListItem = {
	id: string;
	title: string;
	subtitle: string | null;
	authors: string[];
	series: string | null;
	seriesNumber: string | null;
	publisher: string | null;
	location: string | null;
	status: BookStatus;
	pageCount: number | null;
	currency: string | null;
	paidPrice: number | null;
	boughtAt: string | null;
	createdAt: number;
	coverVersion: number;
	coverColor: string | null;
	/** Group label when the list is grouped; null means "none of this". */
	group: string | null;
};

export type GroupCount = { label: string | null; count: number };

export type BookPage = { items: BookListItem[]; total: number; groups?: GroupCount[] };

export type Stats = {
	owned: number;
	wishlist: number;
	addedThisMonth: number;
	spentThisMonth: { currency: string; minor: number }[];
	spentTotal: { currency: string; minor: number }[];
	reading: number;
	readThisYear: number;
	series: number;
	authors: number;
};

export type Options = {
	authors: string[];
	publishers: string[];
	series: string[];
	locations: string[];
	tags: string[];
};
