import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { COVER_SIZES, coverStore, type CoverSize } from '#lib/server/covers/index.js';
import { db } from '#lib/server/db/index.js';
import { book } from '#lib/server/db/schema.js';
import { requireLibrary } from '#lib/server/guard.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	const { libraryId } = requireLibrary(locals);
	const size = params.size as CoverSize;
	if (!COVER_SIZES.includes(size)) error(404, 'Not found');

	const row = db
		.select({ version: book.coverVersion })
		.from(book)
		.where(and(eq(book.id, params.id), eq(book.libraryId, libraryId)))
		.get();
	if (!row || row.version === 0) error(404, 'No cover');

	const image = await coverStore.read(params.id, size);
	if (!image) error(404, 'No cover');

	// The client adds ?v=<coverVersion>, so a given URL never changes.
	return new Response(new Uint8Array(image), {
		headers: {
			'content-type': 'image/jpeg',
			'cache-control': 'private, max-age=31536000, immutable'
		}
	});
};
