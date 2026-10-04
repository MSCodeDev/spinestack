// Import the books from the old SpineStack database (the Kotlin/Vue version) into a user's library.
//
//   npm run import:legacy -- <old.sqlite> --email you@example.com [--dry-run] [--no-covers]
//
// The target database is DATABASE_URL, or DATA_DIR/spinestack.db (see .env). A backup of it is made
// first. Covers are downloaded from Open Library by ISBN, since the old image files are not part of
// the database; pass --no-covers to skip that.
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import { createCoverStore } from '../src/lib/server/covers/store.js';
import { createDb } from '../src/lib/server/db/factory.js';
import { library, user } from '../src/lib/server/db/schema.js';
import { downloadCovers, importLegacy, readLegacy } from '../src/lib/server/legacy/import.js';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
};
const source = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--email');
const email = option('--email');
const dryRun = flag('--dry-run');

if (!source || !email) {
	console.error(
		'Usage: npm run import:legacy -- <old.sqlite> --email <user email> [--dry-run] [--no-covers]'
	);
	process.exit(1);
}
if (!fs.existsSync(source)) {
	console.error(`Cannot find ${source}`);
	process.exit(1);
}

const dataDir = path.resolve(process.env.DATA_DIR || './data');
const target = process.env.DATABASE_URL || path.join(dataDir, 'spinestack.db');

const old = new Database(source, { readonly: true, fileMustExist: true });
const data = readLegacy(old);
old.close();
console.log(`Read ${data.books.length} books from ${source}`);

const { client, db } = createDb(target);
migrate(db, { migrationsFolder: path.resolve('drizzle') });

const owner = db.select().from(user).where(eq(user.email, email)).get();
if (!owner) {
	console.error(
		`No user with email ${email} in ${target}. Sign in to the app once, or check the address.`
	);
	process.exit(1);
}
const lib = db.select().from(library).where(eq(library.ownerId, owner.id)).get();
if (!lib) {
	console.error(`${email} has no library.`);
	process.exit(1);
}

if (!dryRun) {
	const backup = `${target}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
	await client.backup(backup);
	console.log(`Backed up ${target} to ${backup}`);
}

const report = importLegacy(db, lib.id, owner.id, data, { dryRun });
console.log(
	`${dryRun ? 'Would import' : 'Imported'} ${report.imported} books and ${report.readings} reading records.`
);
if (report.duplicates.length)
	console.log(
		`Skipped ${report.duplicates.length} already in the library: ${report.duplicates.slice(0, 5).join(', ')}${report.duplicates.length > 5 ? '…' : ''}`
	);
if (report.invalidIsbn.length)
	console.log(
		`Left off ${report.invalidIsbn.length} invalid ISBNs: ${report.invalidIsbn.join('; ')}`
	);
if (report.otherContributors)
	console.log(
		`Ignored ${report.otherContributors} non-author contributors (illustrators, printers…), which the new app does not track.`
	);

if (!dryRun && !flag('--no-covers') && report.forCovers.length) {
	console.log(`Downloading covers for ${report.forCovers.length} books from Open Library…`);
	const store = createCoverStore(path.join(dataDir, 'covers'));
	const result = await downloadCovers(db, store, lib.id, report.forCovers, {
		onProgress: ({ done, total, ok }) =>
			process.stdout.write(`\r  ${done}/${total} (${ok} found)   `)
	});
	console.log(`\nCovers: ${result.ok} of ${result.total} found; the rest keep a generated cover.`);
}

client.close();
