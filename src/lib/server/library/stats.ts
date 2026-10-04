import { sql } from 'drizzle-orm';
import type { Db } from '../db/factory.js';
import type { Stats } from '../../types.js';

type Spend = { currency: string; minor: number };

export function getStats(db: Db, libraryId: string, now = new Date()): Stats {
	const month = now.toISOString().slice(0, 7);
	const year = now.toISOString().slice(0, 4);
	const one = <T>(query: ReturnType<typeof sql>) => db.get<T>(query);

	const counts = one<{ owned: number; wishlist: number; addedThisMonth: number }>(sql`
		select
			coalesce(sum(status = 'owned'), 0) as owned,
			coalesce(sum(status = 'wishlist'), 0) as wishlist,
			coalesce(sum(strftime('%Y-%m', created_at / 1000, 'unixepoch') = ${month}), 0) as addedThisMonth
		from book where library_id = ${libraryId}
	`);

	const spend = (extra: ReturnType<typeof sql>) =>
		db.all<Spend>(sql`
			select currency, sum(paid_price) as minor
			from book
			where library_id = ${libraryId} and status = 'owned'
				and paid_price is not null and currency is not null ${extra}
			group by currency order by minor desc
		`);

	const readings = one<{ reading: number; readThisYear: number }>(sql`
		select
			count(distinct case when r.finished_at is null then r.book_id end) as reading,
			count(distinct case when substr(r.finished_at, 1, 4) = ${year} then r.book_id end) as readThisYear
		from reading r join book b on b.id = r.book_id
		where b.library_id = ${libraryId}
	`);

	const entities = one<{ series: number; authors: number }>(sql`
		select
			(select count(*) from series where library_id = ${libraryId}) as series,
			(select count(*) from person where library_id = ${libraryId}) as authors
	`);

	return {
		...counts,
		spentThisMonth: spend(sql`and substr(bought_at, 1, 7) = ${month}`),
		spentTotal: spend(sql``),
		...readings,
		...entities
	};
}
