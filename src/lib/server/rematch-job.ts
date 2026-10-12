import { hardcoverToken } from '#lib/server/config.js';
import { coverStore } from '#lib/server/covers/index.js';
import { isbnCovers } from '#lib/server/covers/apple.js';
import { db } from '#lib/server/db/index.js';
import { setBookCoverFromUrl } from '#lib/server/library/cover.js';
import {
	idleProgress,
	rematchLibrary,
	type RematchOptions,
	type RematchProgress
} from '#lib/server/library/rematch.js';
import { http, metadata } from '#lib/server/metadata/index.server.js';

// One run at a time: the providers rate-limit, and a run reads the whole library.
let job: { libraryId: string; progress: RematchProgress; abort: AbortController } | null = null;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const rematchStatus = (libraryId: string): RematchProgress =>
	job?.libraryId === libraryId ? job.progress : idleProgress();

export const rematchRunning = () => job?.progress.state === 'running';

export function cancelRematch(libraryId: string) {
	if (job?.libraryId === libraryId && job.progress.state === 'running') job.abort.abort();
}

/** Start a run in the background. False when one is already running. */
export function startRematch(libraryId: string, options: RematchOptions): boolean {
	if (rematchRunning()) return false;

	const progress = idleProgress();
	progress.state = 'running';
	const abort = new AbortController();
	job = { libraryId, progress, abort };

	void run(libraryId, options, progress, abort.signal);
	return true;
}

async function run(
	libraryId: string,
	options: RematchOptions,
	progress: RematchProgress,
	signal: AbortSignal
) {
	try {
		await rematchLibrary(
			{
				db,
				lookupByIsbn: (isbn) => metadata.lookupByIsbn(isbn),
				search: (query) => metadata.search(query),
				async coverUrls(isbn, match) {
					const urls = [match?.coverUrl ?? null];
					if (isbn) {
						urls.push(
							...(await isbnCovers(http, isbn).then(
								(found) => found.map((c) => c.url),
								() => []
							))
						);
						urls.push(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`);
					}
					return [...new Set(urls.filter((u): u is string => !!u))];
				},
				setCover: (bookId, url) => setBookCoverFromUrl(db, coverStore, libraryId, bookId, url),
				// Hardcover allows about 60 requests a minute.
				pause: () => sleep(hardcoverToken ? 1_100 : 350)
			},
			libraryId,
			options,
			progress,
			() => {},
			signal
		);
	} catch (e) {
		progress.state = 'failed';
		progress.current = null;
		progress.error = e instanceof Error ? e.message : 'Something went wrong.';
	}
}
