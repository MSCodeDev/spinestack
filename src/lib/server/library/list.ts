import { type SQL, sql } from 'drizzle-orm';
import type { Db } from '../db/factory.js';
import type { LibraryQuery, SortField } from '../../library/query.js';
import type { BookListItem, BookPage } from '../../types.js';
import { buildMatch } from './search.js';

type Row = Omit<BookListItem, 'authors' | 'createdAt'> & { createdAt: number };

const firstAuthor = sql`(select p.name from book_person bp join person p on p.id = bp.person_id
	where bp.book_id = b.id order by bp.position limit 1)`;

/** Sort key per field; nulls always sort last. */
const sortKey: Record<SortField, SQL> = {
	title: sql`b.title collate nocase`,
	author: sql`${firstAuthor} collate nocase`,
	series: sql`(select name from series where id = b.series_id) collate nocase`,
	added: sql`b.created_at`,
	bought: sql`b.bought_at`,
	arrived: sql`b.arrived_at`,
	pages: sql`b.page_count`,
	price: sql`b.paid_price`
};

function orderBy({ sort, dir }: Pick<LibraryQuery, 'sort' | 'dir'>): SQL {
	const key = sortKey[sort];
	const direction = dir === 'asc' ? sql`asc` : sql`desc`;
	const seriesNumber =
		sort === 'series' ? sql`, cast(b.series_number as real) ${direction}` : sql``;
	return sql`${key} is null, ${key} ${direction}${seriesNumber}, b.title collate nocase, b.id`;
}

export function queryBooks(
	db: Db,
	libraryId: string,
	query: LibraryQuery,
	page: { offset: number; limit: number }
): BookPage {
	const conditions: SQL[] = [sql`b.library_id = ${libraryId}`];

	const match = buildMatch(query.q);
	if (match) {
		conditions.push(sql`b.id in (select book_id from book_fts where book_fts match ${match})`);
	}

	const where = sql.join(conditions, sql` and `);

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
			b.bought_at as boughtAt,
			b.created_at as createdAt,
			b.cover_version as coverVersion,
			b.cover_color as coverColor
		from book b
		where ${where}
		order by ${orderBy(query)}
		limit ${page.limit} offset ${page.offset}
	`);

	const authors = new Map<string, string[]>();
	if (rows.length) {
		const ids = sql.join(
			rows.map((r) => sql`${r.id}`),
			sql`, `
		);
		const found = db.all<{ bookId: string; name: string }>(sql`
			select bp.book_id as bookId, p.name
			from book_person bp join person p on p.id = bp.person_id
			where bp.book_id in (${ids})
			order by bp.position
		`);
		for (const { bookId, name } of found) {
			authors.set(bookId, [...(authors.get(bookId) ?? []), name]);
		}
	}

	return {
		total,
		items: rows.map((r) => ({ ...r, authors: authors.get(r.id) ?? [] }))
	};
}
