import { asc, eq } from 'drizzle-orm';
import type { Db } from '../db/factory.js';
import { book } from '../db/schema.js';
import type { BookDetail, BookInput, MetadataResult, RematchProgress } from '../../types.js';
import { DuplicateIsbnError, getBook, saveBook } from './books.js';

export type { RematchProgress };

export type RematchOptions = {
	/** Replace details that are already filled in, not only the blank ones. */
	overwrite: boolean;
	/** Replace covers that are already set, not only the missing ones. */
	replaceCovers: boolean;
};

export const idleProgress = (): RematchProgress => ({
	state: 'idle',
	total: 0,
	done: 0,
	current: null,
	matched: 0,
	updated: 0,
	covers: 0,
	failed: 0,
	unmatched: [],
	unmatchedCount: 0,
	error: null
});

export type RematchDeps = {
	db: Db;
	lookupByIsbn(isbn: string): Promise<MetadataResult | null>;
	search(query: { title: string; author?: string }): Promise<MetadataResult[]>;
	/** Cover image URLs to try for a book, best first. */
	coverUrls(isbn: string | null, match: MetadataResult | null): Promise<string[]>;
	setCover(bookId: string, url: string): Promise<boolean>;
	/** Called between books, to stay inside provider rate limits. */
	pause?: () => Promise<void>;
};

const UNMATCHED_LIMIT = 100;
const MAX_CONSECUTIVE_FAILURES = 8;

const norm = (s: string | null | undefined) =>
	(s ?? '')
		.normalize('NFKD')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.toLowerCase();

/** A search result is only trusted when it has the same title and an author in common. */
function confident(
	results: MetadataResult[],
	title: string,
	subtitle: string | null,
	authors: string[]
) {
	const wanted = new Set([norm(title), norm(`${title} ${subtitle ?? ''}`)]);
	const names = authors.map(norm).filter(Boolean);
	return results.find((r) => {
		const sameTitle =
			wanted.has(norm(r.title)) || wanted.has(norm(`${r.title} ${r.subtitle ?? ''}`));
		if (!sameTitle) return false;
		if (!names.length || !r.authors.length) return true;
		return r.authors.some((a) => names.includes(norm(a)));
	});
}

const toInput = (d: BookDetail): BookInput => ({
	title: d.title,
	subtitle: d.subtitle,
	authors: d.authors,
	isbn: d.isbn,
	publisher: d.publisher,
	series: d.series,
	seriesNumber: d.seriesNumber,
	location: d.location,
	tags: d.tags,
	status: d.status,
	pageCount: d.pageCount,
	language: d.language,
	synopsis: d.synopsis,
	notes: d.notes,
	currency: d.currency,
	labelPrice: d.labelPrice,
	paidPrice: d.paidPrice,
	boughtAt: d.boughtAt,
	arrivedAt: d.arrivedAt
});

const blank = (v: unknown) => v === null || v === undefined || v === '';

/** Fields the provider can improve; never the user's own (notes, prices, location, tags, status). */
function patch(current: BookInput, found: MetadataResult, overwrite: boolean): Partial<BookInput> {
	const use = <T>(have: T | null, next: T | null) =>
		!blank(next) && next !== have && (blank(have) || overwrite);

	const out: Partial<BookInput> = {};
	if (use(current.subtitle, found.subtitle)) out.subtitle = found.subtitle;
	if (use(current.publisher, found.publisher)) out.publisher = found.publisher;
	if (use(current.pageCount, found.pageCount)) out.pageCount = found.pageCount;
	if (use(current.language, found.language)) out.language = found.language;
	if (use(current.synopsis, found.synopsis)) out.synopsis = found.synopsis;
	// Identity fields are only ever filled in, never changed.
	if (blank(current.isbn) && found.isbn) out.isbn = found.isbn;
	if (!current.authors.length && found.authors.length) out.authors = found.authors;
	return out;
}

/**
 * Look every book in a library up again, filling in missing details and covers. `progress` is
 * updated in place and `changed` called after each book, so a caller can report on it live.
 */
export async function rematchLibrary(
	deps: RematchDeps,
	libraryId: string,
	options: RematchOptions,
	progress: RematchProgress,
	changed: () => void = () => {},
	signal?: AbortSignal
): Promise<void> {
	const { db } = deps;
	const rows = db
		.select({ id: book.id })
		.from(book)
		.where(eq(book.libraryId, libraryId))
		.orderBy(asc(book.createdAt))
		.all();

	progress.total = rows.length;
	progress.state = 'running';
	changed();

	let failures = 0;
	for (const { id } of rows) {
		if (signal?.aborted) {
			progress.state = 'cancelled';
			progress.current = null;
			changed();
			return;
		}

		const detail = getBook(db, libraryId, id);
		if (!detail) {
			progress.done++;
			continue;
		}
		progress.current = detail.title;
		changed();

		const input = toInput(detail);
		const hasCover = detail.coverVersion > 0;

		let match: MetadataResult | null;
		try {
			if (input.isbn) {
				match = await deps.lookupByIsbn(input.isbn);
			} else {
				const results = await deps.search({ title: input.title, author: input.authors[0] });
				match = confident(results, input.title, input.subtitle, input.authors) ?? null;
			}
			failures = 0;
		} catch {
			progress.failed++;
			if (++failures >= MAX_CONSECUTIVE_FAILURES) {
				progress.state = 'failed';
				progress.current = null;
				progress.error = 'Book lookup services are unavailable right now. Try again later.';
				changed();
				return;
			}
			progress.done++;
			changed();
			await deps.pause?.();
			continue;
		}

		if (match) {
			progress.matched++;
			const changes = patch(input, match, options.overwrite);
			if (Object.keys(changes).length) {
				try {
					saveBook(db, libraryId, { ...input, ...changes }, id);
					progress.updated++;
				} catch (e) {
					// The provider's ISBN belongs to another book here; keep everything else.
					if (!(e instanceof DuplicateIsbnError) || !changes.isbn) throw e;
					delete changes.isbn;
					if (Object.keys(changes).length) {
						saveBook(db, libraryId, { ...input, ...changes }, id);
						progress.updated++;
					}
				}
			}
		} else {
			progress.unmatchedCount++;
			if (progress.unmatched.length < UNMATCHED_LIMIT) {
				progress.unmatched.push({ id, title: input.title });
			}
		}

		if ((match || input.isbn) && (!hasCover || options.replaceCovers)) {
			const urls = await deps.coverUrls(input.isbn ?? match?.isbn ?? null, match).catch(() => []);
			for (const url of urls) {
				try {
					if (await deps.setCover(id, url)) {
						progress.covers++;
						break;
					}
				} catch {
					// not an image, too small, host not allowed…; try the next source
				}
			}
		}

		progress.done++;
		changed();
		await deps.pause?.();
	}

	progress.state = 'done';
	progress.current = null;
	changed();
}
