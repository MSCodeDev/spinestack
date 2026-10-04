import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/factory.js';
import {
	book,
	bookPerson,
	bookTag,
	location,
	person,
	publisher,
	reading,
	series,
	tag
} from '../db/schema.js';
import type { BookDetail, BookInput, Options } from '../../types.js';
import { deleteFts, refreshFts } from './fts.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Named = typeof person | typeof publisher | typeof tag | typeof location | typeof series;

export class DuplicateIsbnError extends Error {
	constructor(readonly bookId: string) {
		super('A book with this ISBN already exists');
	}
}

/** Case-insensitive find-or-create of a library-scoped named row. */
function ensureNamed(tx: Tx, table: Named, libraryId: string, name: string) {
	const t = table as typeof person;
	const found = tx
		.select({ id: t.id })
		.from(t)
		.where(and(eq(t.libraryId, libraryId), sql`lower(${t.name}) = lower(${name})`))
		.get();
	if (found) return found.id;
	return tx.insert(t).values({ libraryId, name }).returning({ id: t.id }).get().id;
}

const optionalName = (tx: Tx, table: Named, libraryId: string, name: string | null) =>
	name ? ensureNamed(tx, table, libraryId, name) : null;

function findByIsbn(db: Db | Tx, libraryId: string, isbn: string) {
	return db
		.select({ id: book.id })
		.from(book)
		.where(and(eq(book.libraryId, libraryId), eq(book.isbn, isbn)))
		.get();
}

/** Create (no `id`) or update a book with all its relations. Returns the book id. */
export function saveBook(db: Db, libraryId: string, input: BookInput, id?: string): string {
	return db.transaction((tx) => {
		if (input.isbn) {
			const dup = findByIsbn(tx, libraryId, input.isbn);
			if (dup && dup.id !== id) throw new DuplicateIsbnError(dup.id);
		}

		const values = {
			title: input.title,
			subtitle: input.subtitle,
			isbn: input.isbn,
			seriesId: optionalName(tx, series, libraryId, input.series),
			seriesNumber: input.seriesNumber,
			publisherId: optionalName(tx, publisher, libraryId, input.publisher),
			locationId: optionalName(tx, location, libraryId, input.location),
			status: input.status,
			pageCount: input.pageCount,
			language: input.language,
			synopsis: input.synopsis,
			notes: input.notes,
			currency: input.currency,
			labelPrice: input.labelPrice,
			paidPrice: input.paidPrice,
			boughtAt: input.boughtAt,
			arrivedAt: input.arrivedAt
		};

		let bookId = id;
		if (bookId) {
			const updated = tx
				.update(book)
				.set(values)
				.where(and(eq(book.id, bookId), eq(book.libraryId, libraryId)))
				.returning({ id: book.id })
				.get();
			if (!updated) throw new Error('Book not found');
		} else {
			bookId = tx
				.insert(book)
				.values({ ...values, libraryId })
				.returning({ id: book.id })
				.get().id;
		}

		tx.delete(bookPerson).where(eq(bookPerson.bookId, bookId)).run();
		input.authors.forEach((name, position) => {
			const personId = ensureNamed(tx, person, libraryId, name);
			tx.insert(bookPerson)
				.values({ bookId, personId, role: 'Author', position })
				.onConflictDoNothing()
				.run();
		});

		tx.delete(bookTag).where(eq(bookTag.bookId, bookId)).run();
		for (const name of input.tags) {
			const tagId = ensureNamed(tx, tag, libraryId, name);
			tx.insert(bookTag).values({ bookId, tagId }).onConflictDoNothing().run();
		}

		refreshFts(tx, bookId);
		return bookId;
	});
}

/** Map of ISBN to book id for those ISBNs already in the library. */
export function findExistingIsbns(db: Db, libraryId: string, isbns: string[]): Map<string, string> {
	if (!isbns.length) return new Map();
	const rows = db
		.select({ id: book.id, isbn: book.isbn })
		.from(book)
		.where(and(eq(book.libraryId, libraryId), inArray(book.isbn, isbns)))
		.all();
	return new Map(rows.map((r) => [r.isbn!, r.id]));
}

export function getBook(db: Db, libraryId: string, id: string): BookDetail | null {
	const row = db
		.select()
		.from(book)
		.where(and(eq(book.id, id), eq(book.libraryId, libraryId)))
		.get();
	if (!row) return null;

	const name = (table: Named, ref: string | null) => {
		if (!ref) return null;
		const t = table as typeof person;
		return db.select({ name: t.name }).from(t).where(eq(t.id, ref)).get()?.name ?? null;
	};

	const authors = db
		.select({ name: person.name })
		.from(bookPerson)
		.innerJoin(person, eq(person.id, bookPerson.personId))
		.where(and(eq(bookPerson.bookId, id), eq(bookPerson.role, 'Author')))
		.orderBy(asc(bookPerson.position))
		.all()
		.map((r) => r.name);

	const tags = db
		.select({ name: tag.name })
		.from(bookTag)
		.innerJoin(tag, eq(tag.id, bookTag.tagId))
		.where(eq(bookTag.bookId, id))
		.orderBy(asc(tag.name))
		.all()
		.map((r) => r.name);

	const readings = db
		.select({ id: reading.id, startedAt: reading.startedAt, finishedAt: reading.finishedAt })
		.from(reading)
		.where(eq(reading.bookId, id))
		.orderBy(sql`${reading.startedAt} desc`)
		.all();

	return {
		id: row.id,
		title: row.title,
		subtitle: row.subtitle,
		authors,
		isbn: row.isbn,
		publisher: name(publisher, row.publisherId),
		series: name(series, row.seriesId),
		seriesNumber: row.seriesNumber,
		location: name(location, row.locationId),
		tags,
		status: row.status,
		pageCount: row.pageCount,
		language: row.language,
		synopsis: row.synopsis,
		notes: row.notes,
		currency: row.currency,
		labelPrice: row.labelPrice,
		paidPrice: row.paidPrice,
		boughtAt: row.boughtAt,
		arrivedAt: row.arrivedAt,
		coverVersion: row.coverVersion,
		createdAt: row.createdAt.getTime(),
		readings
	};
}

export function deleteBook(db: Db, libraryId: string, id: string) {
	return db.transaction((tx) => {
		const deleted = tx
			.delete(book)
			.where(and(eq(book.id, id), eq(book.libraryId, libraryId)))
			.returning({ id: book.id })
			.get();
		if (deleted) deleteFts(tx, id);
		return !!deleted;
	});
}

export function startReading(db: Db, libraryId: string, bookId: string, userId: string) {
	if (!getBookId(db, libraryId, bookId)) return;
	db.insert(reading)
		.values({ bookId, userId, startedAt: new Date().toISOString().slice(0, 10) })
		.run();
}

export function finishReading(db: Db, libraryId: string, readingId: string) {
	const row = db
		.select({ id: reading.id, bookId: reading.bookId, finishedAt: reading.finishedAt })
		.from(reading)
		.innerJoin(book, eq(book.id, reading.bookId))
		.where(and(eq(reading.id, readingId), eq(book.libraryId, libraryId)))
		.get();
	if (!row || row.finishedAt) return;
	db.update(reading)
		.set({ finishedAt: new Date().toISOString().slice(0, 10) })
		.where(eq(reading.id, readingId))
		.run();
}

const getBookId = (db: Db, libraryId: string, id: string) =>
	db
		.select({ id: book.id })
		.from(book)
		.where(and(eq(book.id, id), eq(book.libraryId, libraryId)))
		.get();

/** Existing names for autocomplete in the book form. */
export function getOptions(db: Db, libraryId: string): Options {
	const names = (table: Named) => {
		const t = table as typeof person;
		return db
			.select({ name: t.name })
			.from(t)
			.where(eq(t.libraryId, libraryId))
			.orderBy(asc(t.name))
			.all()
			.map((r) => r.name);
	};
	return {
		authors: names(person),
		publishers: names(publisher),
		series: names(series),
		locations: names(location),
		tags: names(tag)
	};
}
