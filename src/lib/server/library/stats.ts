import { sql } from 'drizzle-orm';
import type { Db } from '../db/factory.js';
import type { Stats } from '../../types.js';
import { paidMajor } from './currency.js';

/** The slider needs a range, so a single date is widened by a day. */
const nextDay = (iso: string) =>
	new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

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

	const prices = one<{ lo: number | null; hi: number | null }>(sql`
		select min(${paidMajor}) as lo, max(${paidMajor}) as hi
		from book b where b.library_id = ${libraryId} and b.paid_price > 0
	`);
	const priceRange =
		prices.lo === null || prices.hi === null
			? null
			: {
					min: Math.floor(prices.lo),
					max: Math.max(Math.ceil(prices.hi), Math.floor(prices.lo) + 1)
				};

	const dates = one<{ lo: string | null; hi: string | null }>(sql`
		select min(strftime('%Y-%m-%d', created_at / 1000, 'unixepoch')) as lo,
			max(strftime('%Y-%m-%d', created_at / 1000, 'unixepoch')) as hi
		from book where library_id = ${libraryId}
	`);
	const dateRange =
		dates.lo === null || dates.hi === null
			? null
			: { min: dates.lo, max: dates.hi === dates.lo ? nextDay(dates.hi) : dates.hi };

	return {
		...counts,
		priceRange,
		dateRange,
		spentThisMonth: spend(sql`and substr(bought_at, 1, 7) = ${month}`),
		spentTotal: spend(sql``),
		...readings,
		...entities
	};
}
