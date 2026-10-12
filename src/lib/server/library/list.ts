import { type SQL, sql } from 'drizzle-orm';
import type { Db } from '../db/factory.js';
import type { GroupField, LibraryQuery, ListFilter, SortField } from '../../library/query.js';
import type { BookListItem, BookPage, GroupCount } from '../../types.js';
import { parseDateRange, parsePriceRange } from '../../library/ranges.js';
import { paidMajor } from './currency.js';
import { buildMatch } from './search.js';

type Row = Omit<BookListItem, 'authors'>;

const list = (values: unknown[]) =>
	sql.join(
		values.map((v) => sql`${v}`),
		sql`, `
	);

const firstAuthor = sql`(select p.name from book_person bp join person p on p.id = bp.person_id
	where bp.book_id = b.id order by bp.position limit 1)`;

/** Sort key per field; nulls always sort last. */
const sortKey: Record<SortField, SQL> = {
	title: sql`b.title collate nocase`,
	author: sql`${firstAuthor} collate nocase`,
	series: sql`(select name from series where id = b.series_id) collate nocase`,
	added: sql`b.created_at`,
	pages: sql`b.page_count`,
	price: sql`b.paid_price`
};

/** The day a book was added, as YYYY-MM-DD. */
const addedDay = sql`strftime('%Y-%m-%d', b.created_at / 1000, 'unixepoch')`;

const readingState = sql`(case
	when exists (select 1 from reading r where r.book_id = b.id and r.finished_at is null) then 'reading'
	when exists (select 1 from reading r where r.book_id = b.id) then 'read'
	else 'unread' end)`;

type Group = { label: SQL; order: SQL; dir: 'asc' | 'desc' };

/** Group label shown in the UI, plus the key and direction the groups are ordered by. */
const groups: Record<Exclude<GroupField, 'none'>, Group> = {
	author: { label: firstAuthor, order: sql`${firstAuthor} collate nocase`, dir: 'asc' },
	series: {
		label: sql`(select name from series where id = b.series_id)`,
		order: sql`(select name from series where id = b.series_id) collate nocase`,
		dir: 'asc'
	},
	publisher: {
		label: sql`(select name from publisher where id = b.publisher_id)`,
		order: sql`(select name from publisher where id = b.publisher_id) collate nocase`,
		dir: 'asc'
	},
	location: {
		label: sql`(select name from location where id = b.location_id)`,
		order: sql`(select name from location where id = b.location_id) collate nocase`,
		dir: 'asc'
	},
	reading: {
		label: readingState,
		order: sql`(case ${readingState} when 'reading' then 0 when 'unread' then 1 else 2 end)`,
		dir: 'asc'
	},
	addedMonth: {
		label: sql`strftime('%Y-%m', b.created_at / 1000, 'unixepoch')`,
		order: sql`strftime('%Y-%m', b.created_at / 1000, 'unixepoch')`,
		dir: 'desc'
	}
};

function orderBy({ sort, dir, group }: Pick<LibraryQuery, 'sort' | 'dir' | 'group'>): SQL {
	const key = sortKey[sort];
	const direction = dir === 'asc' ? sql`asc` : sql`desc`;
	const seriesNumber =
		sort === 'series' ? sql`, cast(b.series_number as real) ${direction}` : sql``;
	const groupOrder =
		group === 'none'
			? sql``
			: sql`${groups[group].order} is null, ${groups[group].order} ${groups[group].dir === 'asc' ? sql`asc` : sql`desc`}, `;
	return sql`${groupOrder}${key} is null, ${key} ${direction}${seriesNumber}, b.title collate nocase, b.id`;
}

/** Subquery selecting book ids that have any of the given names in a relation. */
const relation: Record<ListFilter, (names: SQL) => SQL> = {
	series: (names) => sql`b.series_id in (select id from series where lower(name) in (${names}))`,
	publisher: (names) =>
		sql`b.publisher_id in (select id from publisher where lower(name) in (${names}))`,
	location: (names) =>
		sql`b.location_id in (select id from location where lower(name) in (${names}))`
};

function buildWhere(libraryId: string, q: LibraryQuery): SQL {
	const c: SQL[] = [sql`b.library_id = ${libraryId}`];

	const match = buildMatch(q.q);
	if (match) c.push(sql`b.id in (select book_id from book_fts where book_fts match ${match})`);

	for (const key of Object.keys(relation) as ListFilter[]) {
		if (q[key].length) c.push(relation[key](list(q[key].map((n) => n.toLowerCase()))));
	}

	if (q.reading) c.push(sql`${readingState} = ${q.reading}`);

	const price = parsePriceRange(q.price);
	if (price) {
		// a hair of tolerance so "12.50" matches 1250 minor units despite float division
		if (price.min !== null) c.push(sql`${paidMajor} >= ${price.min - 0.005}`);
		if (price.max !== null) c.push(sql`${paidMajor} <= ${price.max + 0.005}`);
	}

	const date = parseDateRange(q.date);
	if (date?.from) c.push(sql`${addedDay} >= ${date.from}`);
	if (date?.to) c.push(sql`${addedDay} <= ${date.to}`);

	return sql.join(c, sql` and `);
}

export function queryBooks(
	db: Db,
	libraryId: string,
	query: LibraryQuery,
	/** `limit: null` returns every match. */
	page: { offset: number; limit: number | null }
): BookPage {
	const where = buildWhere(libraryId, query);
	const group = query.group === 'none' ? null : groups[query.group];

	const total = db.get<{ n: number }>(sql`select count(*) as n from book b where ${where}`).n;

	const rows = db.all<Row>(sql`
		select
			b.id, b.title, b.subtitle,
			(select name from series where id = b.series_id) as series,
			b.series_number as seriesNumber,
			(select name from publisher where id = b.publisher_id) as publisher,
			(select name from location where id = b.location_id) as location,
			b.status,
			b.page_count as pageCount,
			b.currency,
			b.paid_price as paidPrice,
			b.created_at as createdAt,
			b.cover_version as coverVersion,
			b.cover_color as coverColor,
			${group ? group.label : sql`null`} as "group"
		from book b
		where ${where}
		order by ${orderBy(query)}
		limit ${page.limit ?? -1} offset ${page.offset}
	`);

	const authors = new Map<string, string[]>();
	if (rows.length) {
		const found = db.all<{ bookId: string; name: string }>(sql`
			select bp.book_id as bookId, p.name
			from book_person bp join person p on p.id = bp.person_id
			where bp.book_id in (${list(rows.map((r) => r.id))})
			order by bp.position
		`);
		for (const { bookId, name } of found) {
			authors.set(bookId, [...(authors.get(bookId) ?? []), name]);
		}
	}

	// Per-group totals so headers can show counts even when a group spans pages.
	const groupCounts: GroupCount[] | undefined = group
		? db
				.all<GroupCount>(
					sql`
					select ${group.label} as label, count(*) as count
					from book b where ${where}
					group by label
					order by ${group.order} is null, ${group.order} ${group.dir === 'asc' ? sql`asc` : sql`desc`}
				`
				)
				.map((g) => ({ label: g.label, count: g.count }))
		: undefined;

	return {
		total,
		groups: groupCounts,
		items: rows.map((r) => ({ ...r, authors: authors.get(r.id) ?? [] }))
	};
}
