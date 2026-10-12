import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, sql } from 'drizzle-orm';
import { createDb, type Db } from '../db/factory.js';
import { book, library, user } from '../db/schema.js';
import type { BookInput, MetadataResult } from '../../types.js';
import { getBook, saveBook } from './books.js';
import {
	idleProgress,
	rematchLibrary,
	type RematchDeps,
	type RematchOptions,
	type RematchProgress
} from './rematch.js';

let db: Db;
let lib: string;

const input = (over: Partial<BookInput> = {}): BookInput => ({
	title: 'Dune',
	subtitle: null,
	authors: ['Frank Herbert'],
	isbn: '9780441172719',
	publisher: null,
	series: null,
	seriesNumber: null,
	location: 'Study',
	tags: ['classic'],
	status: 'owned',
	pageCount: null,
	language: null,
	synopsis: null,
	notes: 'Signed copy',
	currency: 'USD',
	labelPrice: 999,
	paidPrice: 750,
	boughtAt: '2024-01-02',
	arrivedAt: null,
	...over
});

const found = (over: Partial<MetadataResult> = {}): MetadataResult => ({
	source: 'hardcover',
	title: 'Dune',
	subtitle: 'The first book',
	authors: ['Frank Herbert'],
	publisher: 'Ace',
	isbn: '9780441172719',
	pageCount: 412,
	synopsis: 'A desert planet.',
	language: 'en',
	coverUrl: 'https://img.test/dune.jpg',
	year: 1965,
	...over
});

type Fakes = Partial<RematchDeps> & { covered: string[] };

function deps(over: Partial<RematchDeps> = {}): RematchDeps & Fakes {
	const fakes = {
		covered: [] as string[]
	};
	return {
		db,
		lookupByIsbn: async () => found(),
		search: async () => [],
		coverUrls: async (_isbn, match) => (match?.coverUrl ? [match.coverUrl] : []),
		async setCover(bookId, url) {
			fakes.covered.push(url);
			db.update(book)
				.set({ coverVersion: sql`${book.coverVersion} + 1` })
				.where(eq(book.id, bookId))
				.run();
			return true;
		},
		...fakes,
		...over
	};
}

async function run(
	d: RematchDeps,
	options: Partial<RematchOptions> = {},
	signal?: AbortSignal
): Promise<RematchProgress> {
	const progress = idleProgress();
	await rematchLibrary(
		d,
		lib,
		{ overwrite: false, replaceCovers: false, ...options },
		progress,
		() => {},
		signal
	);
	return progress;
}

beforeEach(() => {
	({ db } = createDb(':memory:'));
	migrate(db, { migrationsFolder: 'drizzle' });
	db.insert(user).values({ id: 'u1', name: 'U', email: 'u@x.co' }).run();
	lib = db.insert(library).values({ ownerId: 'u1', name: 'L' }).returning().get().id;
});

describe('rematching a library', () => {
	it('fills blank details and a missing cover, leaving your own fields alone', async () => {
		const id = saveBook(db, lib, input());
		const d = deps();
		const p = await run(d);

		const b = getBook(db, lib, id)!;
		expect(b).toMatchObject({
			subtitle: 'The first book',
			publisher: 'Ace',
			pageCount: 412,
			language: 'en',
			synopsis: 'A desert planet.',
			notes: 'Signed copy',
			location: 'Study',
			tags: ['classic'],
			paidPrice: 750,
			coverVersion: 1
		});
		expect(p).toMatchObject({
			state: 'done',
			total: 1,
			done: 1,
			matched: 1,
			updated: 1,
			covers: 1
		});
	});

	it('keeps details that are already filled in unless told to overwrite', async () => {
		const id = saveBook(db, lib, input({ publisher: 'My Edition', pageCount: 500 }));
		await run(deps());
		expect(getBook(db, lib, id)).toMatchObject({ publisher: 'My Edition', pageCount: 500 });

		await run(deps(), { overwrite: true });
		expect(getBook(db, lib, id)).toMatchObject({
			publisher: 'Ace',
			pageCount: 412,
			notes: 'Signed copy',
			tags: ['classic']
		});
	});

	it('does not touch an existing cover unless asked to replace it', async () => {
		const id = saveBook(db, lib, input());
		db.update(book).set({ coverVersion: 3 }).where(eq(book.id, id)).run();

		const first = deps();
		await run(first);
		expect(first.covered).toEqual([]);

		const second = deps();
		const p = await run(second, { replaceCovers: true });
		expect(second.covered).toEqual(['https://img.test/dune.jpg']);
		expect(p.covers).toBe(1);
	});

	it('tries the next cover source when one fails', async () => {
		const id = saveBook(db, lib, input());
		const tried: string[] = [];
		const d = deps({
			coverUrls: async () => ['https://bad.test/a.jpg', 'https://ok.test/b.jpg'],
			async setCover(bookId, url) {
				tried.push(url);
				if (url.includes('bad')) throw new Error('Not a valid image.');
				db.update(book).set({ coverVersion: 1 }).where(eq(book.id, bookId)).run();
				return true;
			}
		});
		const p = await run(d);
		expect(tried).toEqual(['https://bad.test/a.jpg', 'https://ok.test/b.jpg']);
		expect(getBook(db, lib, id)!.coverVersion).toBe(1);
		expect(p.covers).toBe(1);
	});

	it('matches a book without an ISBN only on the same title and an author in common', async () => {
		const sure = saveBook(db, lib, input({ isbn: null }));
		const unsure = saveBook(
			db,
			lib,
			input({ isbn: null, title: 'Emma', authors: ['Jane Austen'] })
		);
		const d = deps({
			search: async ({ title }) =>
				title === 'Dune'
					? [found({ title: 'Dune Messiah' }), found({ isbn: '9780441172719' })]
					: [found({ title: 'Emma', authors: ['Somebody Else'], isbn: '9780141439587' })]
		});
		const p = await run(d);

		expect(getBook(db, lib, sure)).toMatchObject({ isbn: '9780441172719', publisher: 'Ace' });
		expect(getBook(db, lib, unsure)).toMatchObject({ isbn: null, publisher: null });
		expect(p).toMatchObject({ matched: 1, unmatchedCount: 1 });
		expect(p.unmatched).toEqual([{ id: unsure, title: 'Emma' }]);
	});

	it('skips an ISBN that belongs to another book instead of failing', async () => {
		saveBook(db, lib, input({ title: 'Dune (other copy)', isbn: '9780441172719' }));
		const id = saveBook(db, lib, input({ isbn: null }));
		const d = deps({ search: async () => [found()] });
		const p = await run(d);

		expect(getBook(db, lib, id)).toMatchObject({ isbn: null, publisher: 'Ace' });
		expect(p.state).toBe('done');
	});

	it('counts provider failures and gives up when they keep happening', async () => {
		for (let i = 0; i < 10; i++) saveBook(db, lib, input({ title: `B${i}`, isbn: null }));
		const d = deps({
			search: async () => {
				throw new Error('down');
			}
		});
		const p = await run(d);
		expect(p.state).toBe('failed');
		expect(p.failed).toBe(8);
		expect(p.error).toMatch(/unavailable/);
	});

	it('stops between books when cancelled', async () => {
		for (let i = 0; i < 3; i++)
			saveBook(db, lib, input({ title: `B${i}`, isbn: `97804411727${i}1` }));
		const abort = new AbortController();
		const d = deps({
			lookupByIsbn: async () => {
				abort.abort();
				return found();
			}
		});
		const p = await run(d, {}, abort.signal);
		expect(p.state).toBe('cancelled');
		expect(p.done).toBe(1);
	});
});
