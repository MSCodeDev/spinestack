CREATE VIRTUAL TABLE `book_fts` USING fts5(
	title,
	subtitle,
	isbn,
	authors,
	publisher,
	series,
	tags,
	notes,
	book_id UNINDEXED,
	tokenize = 'unicode61 remove_diacritics 2'
);
