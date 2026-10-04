import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/factory.js';
import type { CoverStore } from '../covers/store.js';
import { book } from '../db/schema.js';
import { downloadImage } from '../covers/download.js';

const owned = (libraryId: string, bookId: string) =>
	and(eq(book.id, bookId), eq(book.libraryId, libraryId));

/** Store a new cover for a book and bump its version so caches refresh. False if the book is not in the library. */
export async function setBookCover(
	db: Db,
	store: CoverStore,
	libraryId: string,
	bookId: string,
	image: Buffer
): Promise<boolean> {
	if (!db.select({ id: book.id }).from(book).where(owned(libraryId, bookId)).get()) return false;

	const { color } = await store.save(bookId, image);
	db.update(book)
		.set({ coverVersion: sql`${book.coverVersion} + 1`, coverColor: color })
		.where(owned(libraryId, bookId))
		.run();
	return true;
}

export async function clearBookCover(
	db: Db,
	store: CoverStore,
	libraryId: string,
	bookId: string
): Promise<boolean> {
	const updated = db
		.update(book)
		.set({ coverVersion: 0, coverColor: null })
		.where(owned(libraryId, bookId))
		.returning({ id: book.id })
		.get();
	if (updated) await store.remove(bookId);
	return !!updated;
}

/** Download an image from a provider URL and use it as the book's cover. */
export async function setBookCoverFromUrl(
	db: Db,
	store: CoverStore,
	libraryId: string,
	bookId: string,
	url: string,
	download: (url: string) => Promise<Buffer> = downloadImage
): Promise<boolean> {
	if (!db.select({ id: book.id }).from(book).where(owned(libraryId, bookId)).get()) return false;
	return setBookCover(db, store, libraryId, bookId, await download(url));
}
