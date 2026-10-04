import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { requireLibrary } from '#lib/server/guard.js';
import {
	ENTITY_KINDS,
	EntityNameError,
	deleteEntity,
	deleteUnused,
	listEntities,
	renameEntity,
	type EntityKind
} from '#lib/server/library/entities.js';
import type { RequestHandler } from './$types';

function kindOf(value: unknown): EntityKind {
	if (!ENTITY_KINDS.includes(value as EntityKind)) error(400, 'Unknown kind');
	return value as EntityKind;
}

export const GET: RequestHandler = ({ locals, url }) => {
	const { libraryId } = requireLibrary(locals);
	return json({ entities: listEntities(db, libraryId, kindOf(url.searchParams.get('kind'))) });
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	const { libraryId } = requireLibrary(locals);
	const body = await request.json();
	try {
		const result = renameEntity(
			db,
			libraryId,
			kindOf(body.kind),
			String(body.id ?? ''),
			String(body.name ?? '')
		);
		if (!result) error(404, 'Not found');
		return json(result);
	} catch (e) {
		if (e instanceof EntityNameError) error(400, e.message);
		throw e;
	}
};

/** Delete one entity (`id`), or every unused one of the kind (`unused=1`). */
export const DELETE: RequestHandler = ({ locals, url }) => {
	const { libraryId } = requireLibrary(locals);
	const kind = kindOf(url.searchParams.get('kind'));

	if (url.searchParams.get('unused')) {
		return json({ removed: deleteUnused(db, libraryId, kind) });
	}
	const affected = deleteEntity(db, libraryId, kind, url.searchParams.get('id') ?? '');
	if (affected === null) error(404, 'Not found');
	return json({ affected });
};
