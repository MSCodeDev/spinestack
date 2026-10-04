import { sql } from 'drizzle-orm';
import type { Db } from '../db/factory.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Rebuild the search row for one book from its current relations. */
export function refreshFts(tx: Tx, bookId: string) {
	tx.run(sql`delete from book_fts where book_id = ${bookId}`);
	tx.run(sql`
		insert into book_fts (title, subtitle, isbn, authors, publisher, series, tags, notes, book_id)
		select
			b.title,
			coalesce(b.subtitle, ''),
			coalesce(b.isbn, ''),
			coalesce((select group_concat(p.name, ' ') from book_person bp join person p on p.id = bp.person_id where bp.book_id = b.id), ''),
			coalesce((select name from publisher where id = b.publisher_id), ''),
			coalesce((select name from series where id = b.series_id), ''),
			coalesce((select group_concat(t.name, ' ') from book_tag bt join tag t on t.id = bt.tag_id where bt.book_id = b.id), ''),
			coalesce(b.notes, ''),
			b.id
		from book b where b.id = ${bookId}
	`);
}

export function deleteFts(tx: Tx, bookId: string) {
	tx.run(sql`delete from book_fts where book_id = ${bookId}`);
}
