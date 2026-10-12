import { error, json } from '@sveltejs/kit';
import path from 'node:path';
import { Readable } from 'node:stream';
import { BackupError, exportBackup, restoreBackup } from '#lib/server/backup.js';
import { dataDir } from '#lib/server/config.js';
import { client, db } from '#lib/server/db/index.js';
import { requireAdmin } from '#lib/server/guard.js';
import { rematchRunning } from '#lib/server/rematch-job.js';
import type { RequestHandler } from './$types';

/** Download a backup of the database. It holds every user's data and accounts, so admins only. */
export const GET: RequestHandler = async ({ locals }) => {
	requireAdmin(locals);

	const { stream } = await exportBackup(client, dataDir);
	const name = `spinestack-backup-${new Date().toISOString().slice(0, 10)}.db.gz`;
	return new Response(Readable.toWeb(stream) as ReadableStream, {
		headers: {
			'content-type': 'application/gzip',
			'content-disposition': `attachment; filename="${name}"`,
			'cache-control': 'no-store'
		}
	});
};

/** Replace the whole database with an uploaded backup. */
export const POST: RequestHandler = async ({ locals, request }) => {
	requireAdmin(locals);
	if (rematchRunning()) error(409, 'Wait for the book refresh to finish first.');

	const data = Buffer.from(await request.arrayBuffer());
	if (!data.length) error(400, 'Choose a backup file.');

	try {
		return json(
			await restoreBackup({ client, db }, data, {
				workDir: dataDir,
				migrationsFolder: path.resolve('drizzle')
			})
		);
	} catch (e) {
		if (e instanceof BackupError) error(400, e.message);
		throw e;
	}
};
