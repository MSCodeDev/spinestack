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
export const STATUSES = ['owned', 'wishlist'] as const;

export type View = (typeof VIEWS)[number];
export type SortField = (typeof SORTS)[number];
export type GroupField = (typeof GROUPS)[number];
export type ReadingState = (typeof READING_STATES)[number];
export type Status = (typeof STATUSES)[number];
export type SortDir = 'asc' | 'desc';

/** Entity filters; several values within one filter match any of them. */
export const LIST_FILTERS = ['author', 'series', 'publisher', 'location', 'tag'] as const;
export type ListFilter = (typeof LIST_FILTERS)[number];

/** Field-scoped text search, mapped to FTS columns. */
export const FIELD_SEARCHES = {
	qt: 'title',
	qa: 'authors',
	qp: 'publisher',
	qi: 'isbn'
} as const;
export type FieldSearchParam = keyof typeof FIELD_SEARCHES;

export type LibraryQuery = {
	q: string;
	fields: Record<FieldSearchParam, string>;
	sort: SortField;
	dir: SortDir;
	group: GroupField;
	view: View;
	status: Status | null;
	reading: ReadingState | null;
	cover: boolean | null;
	/** Paid price bounds in major units (e.g. dollars). */
	priceMin: number | null;
	priceMax: number | null;
	boughtFrom: string | null;
	boughtTo: string | null;
} & Record<ListFilter, string[]>;

export const PAGE_SIZE = 60;

/** Defaults that come from the user's preferences rather than being fixed. */
export type QueryDefaults = { view: View };

export const DEFAULT_QUERY: LibraryQuery = {
	q: '',
	fields: { qt: '', qa: '', qp: '', qi: '' },
	sort: 'added',
	dir: 'desc',
	group: 'none',
	view: 'covers',
	status: null,
	reading: null,
	cover: null,
	priceMin: null,
	priceMax: null,
	boughtFrom: null,
	boughtTo: null,
	author: [],
	series: [],
	publisher: [],
	location: [],
	tag: []
};

/** Only `get`/`getAll` are used so SvelteKit tracks just the list params, not modal ones. */
type ParamsReader = { get(name: string): string | null; getAll(name: string): string[] };

const oneOf = <T extends string>(allowed: readonly T[], value: string | null): T | null =>
	allowed.includes(value as T) ? (value as T) : null;

const number = (value: string | null) => {
	if (!value) return null;
	const n = Number(value);
	return Number.isFinite(n) && n >= 0 ? n : null;
};

const date = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);

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
	const cover = params.get('cover');

	return {
		q: params.get('q')?.trim() ?? '',
		fields: {
			qt: params.get('qt')?.trim() ?? '',
			qa: params.get('qa')?.trim() ?? '',
			qp: params.get('qp')?.trim() ?? '',
			qi: params.get('qi')?.trim() ?? ''
		},
		sort,
		dir: sortDir === 'asc' || sortDir === 'desc' ? sortDir : defaultDir(sort),
		group: oneOf(GROUPS, params.get('group')) ?? 'none',
		view: oneOf(VIEWS, params.get('view')) ?? defaults.view,
		status: oneOf(STATUSES, params.get('status')),
		reading: oneOf(READING_STATES, params.get('reading')),
		cover: cover === 'yes' ? true : cover === 'no' ? false : null,
		priceMin: number(params.get('min')),
		priceMax: number(params.get('max')),
		boughtFrom: date(params.get('from')),
		boughtTo: date(params.get('to')),
		author: names(params.getAll('author')),
		series: names(params.getAll('series')),
		publisher: names(params.getAll('publisher')),
		location: names(params.getAll('location')),
		tag: names(params.getAll('tag'))
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
	for (const key of Object.keys(FIELD_SEARCHES) as FieldSearchParam[]) set(key, query.fields[key]);
	if (query.sort !== DEFAULT_QUERY.sort || query.dir !== defaultDir(query.sort)) {
		set('sort', `${query.sort}:${query.dir}`);
	}
	if (query.group !== 'none') set('group', query.group);
	if (query.view !== defaults.view) set('view', query.view);
	set('status', query.status);
	set('reading', query.reading);
	if (query.cover !== null) set('cover', query.cover ? 'yes' : 'no');
	set('min', query.priceMin);
	set('max', query.priceMax);
	set('from', query.boughtFrom);
	set('to', query.boughtTo);
	for (const key of LIST_FILTERS) for (const value of query[key]) params.append(key, value);
	return params;
}

/** Every URL param owned by the list query (the rest belong to modals). */
export const LIST_PARAM_KEYS = [
	'q',
	...Object.keys(FIELD_SEARCHES),
	'sort',
	'group',
	'view',
	'status',
	'reading',
	'cover',
	'min',
	'max',
	'from',
	'to',
	...LIST_FILTERS
];

/** Number of active filters (everything except sort, group and view). */
export function activeFilterCount(query: LibraryQuery): number {
	const d = DEFAULT_QUERY;
	let n = Object.values(query.fields).filter(Boolean).length;
	n += LIST_FILTERS.reduce((sum, key) => sum + query[key].length, 0);
	for (const key of [
		'status',
		'reading',
		'cover',
		'priceMin',
		'priceMax',
		'boughtFrom',
		'boughtTo'
	] as const) {
		if (query[key] !== d[key]) n++;
	}
	return n;
}
