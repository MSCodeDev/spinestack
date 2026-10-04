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

export type View = (typeof VIEWS)[number];
export type SortField = (typeof SORTS)[number];
export type SortDir = 'asc' | 'desc';

export type LibraryQuery = {
	q: string;
	sort: SortField;
	dir: SortDir;
	view: View;
};

export const PAGE_SIZE = 60;

export const DEFAULT_QUERY: LibraryQuery = { q: '', sort: 'added', dir: 'desc', view: 'covers' };

/** Only `get` is used so SvelteKit tracks just the list params, not modal ones. */
type ParamsReader = { get(name: string): string | null };

const oneOf = <T extends string>(allowed: readonly T[], value: string | null, fallback: T): T =>
	allowed.includes(value as T) ? (value as T) : fallback;

export function parseQuery(params: ParamsReader): LibraryQuery {
	const sort = params.get('sort')?.split(':') ?? [];
	const fallback = DEFAULT_QUERY;
	const field = oneOf(SORTS, sort[0] ?? null, fallback.sort);
	return {
		q: params.get('q')?.trim() ?? '',
		sort: field,
		dir: sort[1] === 'asc' || sort[1] === 'desc' ? sort[1] : defaultDir(field),
		view: oneOf(VIEWS, params.get('view'), fallback.view)
	};
}

/** Newest/largest first for dates and numbers, A–Z for text. */
export const defaultDir = (field: SortField): SortDir =>
	field === 'title' || field === 'author' || field === 'series' ? 'asc' : 'desc';

/** Serialise only values that differ from the defaults, to keep URLs short. */
export function serializeQuery(query: LibraryQuery): URLSearchParams {
	const params = new URLSearchParams();
	if (query.q) params.set('q', query.q);
	if (query.sort !== DEFAULT_QUERY.sort || query.dir !== defaultDir(query.sort)) {
		params.set('sort', `${query.sort}:${query.dir}`);
	}
	if (query.view !== DEFAULT_QUERY.view) params.set('view', query.view);
	return params;
}
