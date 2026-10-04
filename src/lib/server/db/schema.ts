import { sql } from 'drizzle-orm';
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

export * from './auth.schema';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
	integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`);

const libraryId = () =>
	text('library_id')
		.notNull()
		.references(() => library.id, { onDelete: 'cascade' });

export const library = sqliteTable('library', {
	id: id(),
	ownerId: text('owner_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	createdAt: createdAt()
});

/** Library-scoped lookup tables share one shape. */
const named = (table: string) =>
	sqliteTable(
		table,
		{ id: id(), libraryId: libraryId(), name: text('name').notNull(), createdAt: createdAt() },
		(t) => [uniqueIndex(`${table}_library_name_idx`).on(t.libraryId, t.name)]
	);

export const person = named('person');
export const publisher = named('publisher');
export const tag = named('tag');
export const location = named('location');

export const series = sqliteTable(
	'series',
	{
		id: id(),
		libraryId: libraryId(),
		name: text('name').notNull(),
		type: text('type'),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('series_library_name_idx').on(t.libraryId, t.name)]
);

export const book = sqliteTable(
	'book',
	{
		id: id(),
		libraryId: libraryId(),
		title: text('title').notNull(),
		subtitle: text('subtitle'),
		isbn: text('isbn'),
		seriesId: text('series_id').references(() => series.id, { onDelete: 'set null' }),
		seriesNumber: text('series_number'),
		publisherId: text('publisher_id').references(() => publisher.id, { onDelete: 'set null' }),
		locationId: text('location_id').references(() => location.id, { onDelete: 'set null' }),
		status: text('status', { enum: ['owned', 'wishlist'] })
			.notNull()
			.default('owned'),
		pageCount: integer('page_count'),
		language: text('language'),
		synopsis: text('synopsis'),
		notes: text('notes'),
		currency: text('currency'),
		/** Prices are integer minor units (cents). */
		labelPrice: integer('label_price'),
		paidPrice: integer('paid_price'),
		boughtAt: text('bought_at'),
		arrivedAt: text('arrived_at'),
		coverVersion: integer('cover_version').notNull().default(0),
		coverColor: text('cover_color'),
		createdAt: createdAt(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
	},
	(t) => [
		index('book_library_idx').on(t.libraryId),
		uniqueIndex('book_library_isbn_idx').on(t.libraryId, t.isbn)
	]
);

export const bookPerson = sqliteTable(
	'book_person',
	{
		bookId: text('book_id')
			.notNull()
			.references(() => book.id, { onDelete: 'cascade' }),
		personId: text('person_id')
			.notNull()
			.references(() => person.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default('Author'),
		position: integer('position').notNull().default(0)
	},
	(t) => [primaryKey({ columns: [t.bookId, t.personId, t.role] })]
);

export const bookTag = sqliteTable(
	'book_tag',
	{
		bookId: text('book_id')
			.notNull()
			.references(() => book.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.bookId, t.tagId] })]
);

export const reading = sqliteTable(
	'reading',
	{
		id: id(),
		bookId: text('book_id')
			.notNull()
			.references(() => book.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		startedAt: text('started_at').notNull(),
		finishedAt: text('finished_at')
	},
	(t) => [index('reading_book_idx').on(t.bookId)]
);

export const userPreference = sqliteTable(
	'user_preference',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		key: text('key').notNull(),
		value: text('value').notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.key] })]
);
