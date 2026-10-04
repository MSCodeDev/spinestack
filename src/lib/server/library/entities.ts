import { and, asc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/factory.js';
import {
	book,
	bookPerson,
	bookTag,
	location,
	person,
	publisher,
	series,
	tag
} from '../db/schema.js';
import { refreshFts } from './fts.js';

export const ENTITY_KINDS = ['author', 'publisher', 'series', 'location', 'tag'] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export type EntityRow = { id: string; name: string; count: number };

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Named = typeof person | typeof publisher | typeof series | typeof location | typeof tag;

const tables: Record<EntityKind, Named> = {
	author: person,
	publisher,
	series,
	location,
	tag
};

/** Books that currently reference the entity. */
function bookIds(tx: Tx | Db, kind: EntityKind, id: string): string[] {
	switch (kind) {
		case 'author':
			return tx
				.select({ id: bookPerson.bookId })
				.from(bookPerson)
				.where(eq(bookPerson.personId, id))
				.all()
				.map((r) => r.id);
		case 'tag':
			return tx
				.select({ id: bookTag.bookId })
				.from(bookTag)
				.where(eq(bookTag.tagId, id))
				.all()
				.map((r) => r.id);
		case 'publisher':
			return tx
				.select({ id: book.id })
				.from(book)
				.where(eq(book.publisherId, id))
				.all()
				.map((r) => r.id);
		case 'series':
			return tx
				.select({ id: book.id })
				.from(book)
				.where(eq(book.seriesId, id))
				.all()
				.map((r) => r.id);
		case 'location':
			return tx
				.select({ id: book.id })
				.from(book)
				.where(eq(book.locationId, id))
				.all()
				.map((r) => r.id);
	}
}

const find = (tx: Tx | Db, kind: EntityKind, libraryId: string, id: string) => {
	const t = tables[kind] as typeof person;
	return tx
		.select()
		.from(t)
		.where(and(eq(t.id, id), eq(t.libraryId, libraryId)))
		.get();
};

/** Every entity of a kind with the number of books using it. */
export function listEntities(db: Db, libraryId: string, kind: EntityKind): EntityRow[] {
	const t = tables[kind] as typeof person;
	return db
		.select({ id: t.id, name: t.name })
		.from(t)
		.where(eq(t.libraryId, libraryId))
		.orderBy(sql`${t.name} collate nocase`, asc(t.id))
		.all()
		.map((row) => ({ ...row, count: bookIds(db, kind, row.id).length }));
}

export class EntityNameError extends Error {}

/**
 * Rename an entity. If another one already has that name (ignoring case), the two are merged:
 * books move to the existing entity and the renamed one is removed.
 */
export function renameEntity(
	db: Db,
	libraryId: string,
	kind: EntityKind,
	id: string,
	rawName: string
): { merged: boolean } | null {
	const name = rawName.trim();
	if (!name) throw new EntityNameError('Name is required.');

	return db.transaction((tx) => {
		if (!find(tx, kind, libraryId, id)) return null;

		const t = tables[kind] as typeof person;
		const target = tx
			.select({ id: t.id })
			.from(t)
			.where(
				and(
					eq(t.libraryId, libraryId),
					sql`lower(${t.name}) = lower(${name})`,
					sql`${t.id} != ${id}`
				)
			)
			.get();

		if (!target) {
			tx.update(t).set({ name }).where(eq(t.id, id)).run();
			for (const bookId of bookIds(tx, kind, id)) refreshFts(tx, bookId);
			return { merged: false };
		}

		const affected = bookIds(tx, kind, id);
		switch (kind) {
			case 'author':
				tx.run(
					sql`update or ignore book_person set person_id = ${target.id} where person_id = ${id}`
				);
				break;
			case 'tag':
				tx.run(sql`update or ignore book_tag set tag_id = ${target.id} where tag_id = ${id}`);
				break;
			case 'publisher':
				tx.update(book).set({ publisherId: target.id }).where(eq(book.publisherId, id)).run();
				break;
			case 'series':
				tx.update(book).set({ seriesId: target.id }).where(eq(book.seriesId, id)).run();
				break;
			case 'location':
				tx.update(book).set({ locationId: target.id }).where(eq(book.locationId, id)).run();
				break;
		}
		tx.delete(t).where(eq(t.id, id)).run();
		for (const bookId of affected) refreshFts(tx, bookId);
		return { merged: true };
	});
}

/** Delete an entity; books keep existing but lose the link. Returns how many books were affected. */
export function deleteEntity(
	db: Db,
	libraryId: string,
	kind: EntityKind,
	id: string
): number | null {
	return db.transaction((tx) => {
		if (!find(tx, kind, libraryId, id)) return null;
		const affected = bookIds(tx, kind, id);
		const t = tables[kind] as typeof person;
		tx.delete(t).where(eq(t.id, id)).run();
		for (const bookId of affected) refreshFts(tx, bookId);
		return affected.length;
	});
}

/** Delete every entity of a kind that no book uses. Returns how many were removed. */
export function deleteUnused(db: Db, libraryId: string, kind: EntityKind): number {
	const unused = listEntities(db, libraryId, kind).filter((e) => e.count === 0);
	const t = tables[kind] as typeof person;
	db.transaction((tx) => {
		for (const { id } of unused) tx.delete(t).where(eq(t.id, id)).run();
	});
	return unused.length;
}
