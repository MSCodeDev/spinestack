import type BetterSqlite3 from 'better-sqlite3';
import { and, eq, sql } from 'drizzle-orm';
import { toIsbn13 } from '../../isbn.js';
import { toMinor } from '../../money.js';
import type { BookInput } from '../../types.js';
import { downloadImage } from '../covers/download.js';
import type { CoverStore } from '../covers/store.js';
import type { Db } from '../db/factory.js';
import { book, reading } from '../db/schema.js';
import { DuplicateIsbnError, saveBook } from '../library/books.js';
import { setBookCover } from '../library/cover.js';

/** One book from the old SpineStack database, with its relations flattened. */
export type LegacyBook = {
	id: string;
	title: string;
	subtitle: string;
	code: string | null;
	barcode: string | null;
	inLibrary: boolean;
	pageCount: number | null;
	synopsis: string;
	notes: string;
	paidCurrency: string | null;
	paidValue: number;
	labelCurrency: string | null;
	labelValue: number;
	boughtAt: string | null;
	arrivedAt: string | null;
	createdAt: string;
	modifiedAt: string;
	publisher: string | null;
	/** Contributors with the role "Author", in the order they were added. */
	authors: string[];
	/** Contributions with any other role, which the new app does not model. */
	otherContributors: number;
	/** Finish dates of completed readings (old data often has no dates, so this is the log date). */
	readings: string[];
};

export type LegacyData = { books: LegacyBook[] };

/** Read the old database into plain objects. */
export function readLegacy(old: BetterSqlite3.Database): LegacyData {
	type Row = Record<string, unknown>;
	const rows = old.prepare('select * from Book order by created_at, id').all() as Row[];

	const authors = new Map<string, string[]>();
	const others = new Map<string, number>();
	const contributions = old
		.prepare(
			`select bc.book_id as bookId, p.name as person, r.name as role
			 from Book_Contributor bc
			 join Person p on p.id = bc.person_id
			 join Contributor_Role r on r.id = bc.role_id
			 order by bc.created_at, bc.id`
		)
		.all() as { bookId: string; person: string; role: string }[];
	for (const c of contributions) {
		if (c.role.trim().toLowerCase() === 'author') {
			authors.set(c.bookId, [...(authors.get(c.bookId) ?? []), c.person.trim()]);
		} else {
			others.set(c.bookId, (others.get(c.bookId) ?? 0) + 1);
		}
	}

	const publishers = new Map<string, string>();
	const pubs = old
		.prepare(
			`select bp.book_id as bookId, p.name as name
			 from Book_Publisher bp join Publisher p on p.id = bp.publisher_id
			 order by bp.created_at, bp.publisher_id`
		)
		.all() as { bookId: string; name: string }[];
	for (const p of pubs) if (!publishers.has(p.bookId)) publishers.set(p.bookId, p.name.trim());

	const readings = new Map<string, string[]>();
	const progress = old
		.prepare(
			`select book_id as bookId, coalesce(finished_at, created_at) as at
			 from Read_Progress where is_completed = 1 order by created_at, id`
		)
		.all() as { bookId: string; at: string }[];
	for (const r of progress) readings.set(r.bookId, [...(readings.get(r.bookId) ?? []), r.at]);

	const text = (v: unknown) => (typeof v === 'string' ? v : '');
	return {
		books: rows.map((r) => ({
			id: String(r.id),
			title: text(r.title).trim(),
			subtitle: text(r.subtitle).trim(),
			code: (r.code as string | null) ?? null,
			barcode: (r.barcode as string | null) ?? null,
			inLibrary: r.is_in_library !== 0,
			pageCount: typeof r.page_count === 'number' && r.page_count > 0 ? r.page_count : null,
			synopsis: text(r.synopsis).replace(/\r\n/g, '\n').trim(),
			notes: text(r.notes).trim(),
			paidCurrency: (r.paid_price_currency as string | null) ?? null,
			paidValue: Number(r.paid_price_value) || 0,
			labelCurrency: (r.label_price_currency as string | null) ?? null,
			labelValue: Number(r.label_price_value) || 0,
			boughtAt: (r.bought_at as string | null) ?? null,
			arrivedAt: (r.arrived_at as string | null) ?? null,
			createdAt: text(r.created_at),
			modifiedAt: text(r.modified_at),
			publisher: publishers.get(String(r.id)) ?? null,
			authors: authors.get(String(r.id)) ?? [],
			otherContributors: others.get(String(r.id)) ?? 0,
			readings: readings.get(String(r.id)) ?? []
		}))
	};
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);
const day = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);

/** "2026-01-31 13:18:11.975198679" (UTC) to epoch milliseconds. */
export function legacyTime(value: string): number | null {
	const ms = Date.parse(`${value.slice(0, 23).replace(' ', 'T')}Z`);
	return Number.isFinite(ms) ? ms : null;
}

/** Map an old book to the new model. Returns the input and whether its ISBN had to be dropped. */
export function toBookInput(b: LegacyBook): { input: BookInput; droppedIsbn: string | null } {
	const isbn = (b.code && toIsbn13(b.code)) || (b.barcode && toIsbn13(b.barcode)) || null;
	const droppedIsbn = !isbn && (b.code || b.barcode) ? (b.code ?? b.barcode) : null;

	// Prices are only set on a few books; the old app stored 0 for "unknown".
	const currency = b.paidValue > 0 ? b.paidCurrency : b.labelValue > 0 ? b.labelCurrency : null;
	const price = (value: number, own: string | null) =>
		currency && own === currency && value > 0 ? toMinor(String(value), currency) : null;

	return {
		droppedIsbn,
		input: {
			title: b.title,
			subtitle: orNull(b.subtitle),
			authors: b.authors,
			isbn,
			publisher: b.publisher,
			series: null,
			seriesNumber: null,
			location: null,
			tags: [],
			status: b.inLibrary ? 'owned' : 'wishlist',
			pageCount: b.pageCount,
			language: null,
			synopsis: orNull(b.synopsis),
			notes: orNull(b.notes),
			currency,
			labelPrice: price(b.labelValue, b.labelCurrency),
			paidPrice: price(b.paidValue, b.paidCurrency),
			boughtAt: day(b.boughtAt),
			arrivedAt: day(b.arrivedAt)
		}
	};
}

export type ImportReport = {
	imported: number;
	/** Books already in the library (same ISBN, or same title when there is no ISBN). */
	duplicates: string[];
	/** Books whose ISBN was invalid and so was left off. */
	invalidIsbn: string[];
	otherContributors: number;
	readings: number;
	/** New book ids with an ISBN, in import order, for the cover download step. */
	forCovers: { id: string; isbn: string; title: string }[];
};

class DryRunRollback extends Error {}

/** Import every old book into one library. All or nothing; `dryRun` rolls everything back. */
export function importLegacy(
	db: Db,
	libraryId: string,
	userId: string,
	data: LegacyData,
	{ dryRun = false } = {}
): ImportReport {
	const report: ImportReport = {
		imported: 0,
		duplicates: [],
		invalidIsbn: [],
		otherContributors: 0,
		readings: 0,
		forCovers: []
	};

	const run = () =>
		db.transaction((tx) => {
			for (const old of data.books) {
				if (!old.title) continue;
				const { input, droppedIsbn } = toBookInput(old);

				if (!input.isbn) {
					const same = tx
						.select({ id: book.id })
						.from(book)
						.where(
							and(eq(book.libraryId, libraryId), sql`lower(${book.title}) = lower(${input.title})`)
						)
						.get();
					if (same) {
						report.duplicates.push(old.title);
						continue;
					}
				}

				let id: string;
				try {
					id = saveBook(tx as unknown as Db, libraryId, input);
				} catch (e) {
					if (e instanceof DuplicateIsbnError) {
						report.duplicates.push(old.title);
						continue;
					}
					throw e;
				}

				// Keep the original "added" dates so the stats and sorting still make sense.
				const created = legacyTime(old.createdAt);
				const updated = legacyTime(old.modifiedAt) ?? created;
				if (created !== null) {
					tx.update(book)
						.set({ createdAt: new Date(created), updatedAt: new Date(updated ?? created) })
						.where(eq(book.id, id))
						.run();
				}

				for (const at of old.readings) {
					const date = day(at);
					if (!date) continue;
					tx.insert(reading)
						.values({ bookId: id, userId, startedAt: date, finishedAt: date })
						.run();
					report.readings++;
				}

				report.imported++;
				report.otherContributors += old.otherContributors;
				if (droppedIsbn) report.invalidIsbn.push(`${old.title} (${droppedIsbn})`);
				if (input.isbn) report.forCovers.push({ id, isbn: input.isbn, title: old.title });
			}
			if (dryRun) throw new DryRunRollback();
		});

	try {
		run();
	} catch (e) {
		if (!(e instanceof DryRunRollback)) throw e;
	}
	return report;
}

export type CoverProgress = { done: number; total: number; ok: number };

/** Download a cover for each book from Open Library by ISBN. Failures are counted, not thrown. */
export async function downloadCovers(
	db: Db,
	store: CoverStore,
	libraryId: string,
	items: ImportReport['forCovers'],
	{
		concurrency = 3,
		onProgress,
		fetchImage = downloadImage
	}: {
		concurrency?: number;
		onProgress?: (p: CoverProgress, last: { title: string; ok: boolean }) => void;
		fetchImage?: (url: string) => Promise<Buffer>;
	} = {}
): Promise<CoverProgress> {
	const progress: CoverProgress = { done: 0, total: items.length, ok: 0 };
	const queue = [...items];

	async function worker() {
		for (let item = queue.shift(); item; item = queue.shift()) {
			let ok = false;
			try {
				const url = `https://covers.openlibrary.org/b/isbn/${item.isbn}-L.jpg?default=false`;
				ok = await setBookCover(db, store, libraryId, item.id, await fetchImage(url));
			} catch {
				// no cover for this ISBN; the book keeps its generated cover
			}
			progress.done++;
			if (ok) progress.ok++;
			onProgress?.({ ...progress }, { title: item.title, ok });
		}
	}

	await Promise.all(Array.from({ length: concurrency }, worker));
	return progress;
}
