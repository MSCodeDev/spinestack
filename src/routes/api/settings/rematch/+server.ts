import { error, json } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/guard.js';
import { cancelRematch, rematchStatus, startRematch } from '#lib/server/rematch-job.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	const { libraryId } = requireAdmin(locals);
	return json({ progress: rematchStatus(libraryId) });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const { libraryId } = requireAdmin(locals);
	const body = await request.json().catch(() => ({}));
	const started = startRematch(libraryId, {
		overwrite: body.overwrite === true,
		replaceCovers: body.replaceCovers === true
	});
	if (!started) error(409, 'A refresh is already running.');
	return json({ progress: rematchStatus(libraryId) }, { status: 202 });
};

export const DELETE: RequestHandler = ({ locals }) => {
	const { libraryId } = requireAdmin(locals);
	cancelRematch(libraryId);
	return json({ progress: rematchStatus(libraryId) });
};
