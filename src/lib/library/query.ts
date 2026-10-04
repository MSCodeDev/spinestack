export const VIEWS = ['covers', 'table', 'stacked'] as const;
export const SORTS = [
	'title',
	'author',
	'series',
	'added',
	'bought',
	'arrived',
	'pages',
	'price'
] as const;
export const GROUPS = [
	'none',
	'author',
	'series',
	'publisher',
	'location',
	'status',
	'reading',
	'addedMonth',
	'boughtYear'
] as const;
export const READING_STATES = ['unread', 'reading', 'read'] as const;

export type View = (typeof VIEWS)[number];
export type SortField = (typeof SORTS)[number];
export type GroupField = (typeof GROUPS)[number];
export type ReadingState = (typeof READING_STATES)[number];
export type SortDir = 'asc' | 'desc';

/** Entity filters; several values within one filter match any of them. */
export const LIST_FILTERS = ['series', 'publisher', 'location'] as const;
export type ListFilter = (typeof LIST_FILTERS)[number];

export type LibraryQuery = {
	q: string;
	sort: SortField;
	dir: SortDir;
	group: GroupField;
	view: View;
	reading: ReadingState | null;
	/** Paid price as typed: "12.50", "10-20", "10-" or "-20" (see ranges.ts). */
	price: string;
	/** Bought date as typed: "2024", "2024-03", or a range such as "2024-01..2024-06". */
	bought: string;
} & Record<ListFilter, string[]>;

export const PAGE_SIZE = 60;

/** Defaults that come from the user's preferences rather than being fixed. */
export type QueryDefaults = { view: View };

export const DEFAULT_QUERY: LibraryQuery = {
	q: '',
	sort: 'added',
	dir: 'desc',
	group: 'none',
	view: 'covers',
	reading: null,
	price: '',
	bought: '',
	series: [],
	publisher: [],
	location: []
};

/** Only `get`/`getAll` are used so SvelteKit tracks just the list params, not modal ones. */
type ParamsReader = { get(name: string): string | null; getAll(name: string): string[] };

const oneOf = <T extends string>(allowed: readonly T[], value: string | null): T | null =>
	allowed.includes(value as T) ? (value as T) : null;

const names = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];

/** Newest/largest first for dates and numbers, A–Z for text. */
export const defaultDir = (field: SortField): SortDir =>
	field === 'title' || field === 'author' || field === 'series' ? 'asc' : 'desc';

export function parseQuery(
	params: ParamsReader,
	defaults: QueryDefaults = { view: DEFAULT_QUERY.view }
): LibraryQuery {
	const [sortField, sortDir] = params.get('sort')?.split(':') ?? [];
	const sort = oneOf(SORTS, sortField ?? null) ?? DEFAULT_QUERY.sort;

	return {
		q: params.get('q')?.trim() ?? '',
		sort,
		dir: sortDir === 'asc' || sortDir === 'desc' ? sortDir : defaultDir(sort),
		group: oneOf(GROUPS, params.get('group')) ?? 'none',
		view: oneOf(VIEWS, params.get('view')) ?? defaults.view,
		reading: oneOf(READING_STATES, params.get('reading')),
		price: params.get('price')?.trim() ?? '',
		bought: params.get('bought')?.trim() ?? '',
		series: names(params.getAll('series')),
		publisher: names(params.getAll('publisher')),
		location: names(params.getAll('location'))
	};
}

/** Serialise only values that differ from the defaults, to keep URLs short. */
export function serializeQuery(
	query: LibraryQuery,
	defaults: QueryDefaults = { view: DEFAULT_QUERY.view }
): URLSearchParams {
	const params = new URLSearchParams();
	const set = (key: string, value: string | number | null) => {
		if (value !== null && value !== '') params.set(key, String(value));
	};

	set('q', query.q);
	if (query.sort !== DEFAULT_QUERY.sort || query.dir !== defaultDir(query.sort)) {
		set('sort', `${query.sort}:${query.dir}`);
	}
	if (query.group !== 'none') set('group', query.group);
	if (query.view !== defaults.view) set('view', query.view);
	set('reading', query.reading);
	set('price', query.price);
	set('bought', query.bought);
	for (const key of LIST_FILTERS) for (const value of query[key]) params.append(key, value);
	return params;
}

/** Every URL param owned by the list query (the rest belong to modals). */
export const LIST_PARAM_KEYS = [
	'q',
	'sort',
	'group',
	'view',
	'reading',
	'price',
	'bought',
	...LIST_FILTERS
];

/** Number of active filters (everything except search, sort, group and view). */
export function activeFilterCount(query: LibraryQuery): number {
	let n = LIST_FILTERS.reduce((sum, key) => sum + query[key].length, 0);
	for (const key of ['reading', 'price', 'bought'] as const) {
		if (query[key] !== DEFAULT_QUERY[key]) n++;
	}
	return n;
}
