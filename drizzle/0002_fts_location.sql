DROP TABLE `book_fts`;--> statement-breakpoint
CREATE VIRTUAL TABLE `book_fts` USING fts5(
	title,
	subtitle,
	isbn,
	authors,
	publisher,
	series,
	tags,
	location,
	notes,
	book_id UNINDEXED,
	tokenize = 'unicode61 remove_diacritics 2'
);--> statement-breakpoint
INSERT INTO `book_fts` (title, subtitle, isbn, authors, publisher, series, tags, location, notes, book_id)
SELECT
	b.title,
	coalesce(b.subtitle, ''),
	coalesce(b.isbn, ''),
	coalesce((SELECT group_concat(p.name, ' ') FROM book_person bp JOIN person p ON p.id = bp.person_id WHERE bp.book_id = b.id), ''),
	coalesce((SELECT name FROM publisher WHERE id = b.publisher_id), ''),
	coalesce((SELECT name FROM series WHERE id = b.series_id), ''),
	coalesce((SELECT group_concat(t.name, ' ') FROM book_tag bt JOIN tag t ON t.id = bt.tag_id WHERE bt.book_id = b.id), ''),
	coalesce((SELECT name FROM location WHERE id = b.location_id), ''),
	coalesce(b.notes, ''),
	b.id
FROM book b;
