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

/** Prefill for the add form, e.g. from a lookup result. */
export type Draft = Partial<BookInput> & { coverUrl?: string | null };

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
	/** Lowest and highest paid price in major units, rounded outwards; null when no book has a price. */
	priceRange: { min: number; max: number } | null;
	/** Earliest and latest day a book was added (YYYY-MM-DD); null for an empty library. */
	dateRange: { min: string; max: string } | null;
};

export type Options = {
	/** Whether any book has a subtitle; when none do, the subtitle field is hidden. */
	hasSubtitles: boolean;
	authors: string[];
	publishers: string[];
	series: string[];
	locations: string[];
	tags: string[];
};

/** A book found by an external provider, before it is added to the library. */
export type MetadataResult = {
	source: 'openlibrary' | 'googlebooks' | 'hardcover';
	title: string;
	subtitle: string | null;
	authors: string[];
	publisher: string | null;
	isbn: string | null;
	pageCount: number | null;
	synopsis: string | null;
	language: string | null;
	coverUrl: string | null;
	year: number | null;
};

/** A lookup result plus the id of the library book with the same ISBN, if any. */
export type LookupResult = MetadataResult & { existingId: string | null };

/** An image a cover can be chosen from. */
export type CoverCandidate = {
	url: string;
	label: string;
	source: MetadataResult['source'] | 'apple';
};
