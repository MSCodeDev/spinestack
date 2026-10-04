import { expect, test } from '@playwright/test';
import { BARCODE_ISBN } from './global-setup';
import { login, resetLibrary } from './helpers';

test.beforeEach(resetLibrary);

const found = (isbn: string, title: string) => ({
	source: 'openlibrary',
	title,
	subtitle: null,
	authors: ['Some Author'],
	publisher: null,
	isbn,
	pageCount: null,
	synopsis: null,
	language: null,
	coverUrl: null,
	year: null,
	existingId: null
});

test('scanning a barcode looks the book up', async ({ page }) => {
	await login(page);
	const asked: string[] = [];
	await page.route('**/api/lookup?*', (route) => {
		const isbn = new URL(route.request().url()).searchParams.get('isbn')!;
		asked.push(isbn);
		return route.fulfill({ json: { results: [found(isbn, 'Scanned Book')] } });
	});

	await page.getByRole('link', { name: 'Add book' }).click();
	const add = page.getByRole('dialog', { name: 'Add book' });
	await add.getByRole('tab', { name: 'ISBN' }).click();
	await add.getByRole('button', { name: 'Scan' }).click();

	// the fake camera shows a clip of this barcode
	await expect(add.getByText('Scanned Book', { exact: true })).toBeVisible({ timeout: 15_000 });
	expect(asked).toContain(BARCODE_ISBN);
	// the same code is only queued once even though the clip loops
	expect(asked.filter((i) => i === BARCODE_ISBN)).toHaveLength(1);

	await add.getByRole('button', { name: 'Stop' }).click();
	await add.getByRole('button', { name: 'Add', exact: true }).click();
	await expect(add.getByText('Added ✓')).toBeVisible();
	await add.getByRole('button', { name: 'Done' }).click();
	await expect(page.getByRole('link', { name: 'Scanned Book' })).toBeVisible();
});

test('batch: queue several ISBNs and add them all', async ({ page }) => {
	await login(page);
	const known: Record<string, string> = {
		'9780441172719': 'Dune',
		'9780306406157': 'Gödel, Escher, Bach'
	};
	await page.route('**/api/lookup?*', (route) => {
		const isbn = new URL(route.request().url()).searchParams.get('isbn')!;
		return route.fulfill({
			json: { results: known[isbn] ? [found(isbn, known[isbn])] : [] }
		});
	});

	await page.getByRole('link', { name: 'Add book' }).click();
	const add = page.getByRole('dialog', { name: 'Add book' });
	await add.getByRole('tab', { name: 'ISBN' }).click();

	await add.getByLabel('ISBN').fill('123');
	await add.getByRole('button', { name: 'Find' }).click();
	await expect(add.getByRole('alert')).toContainText('not a valid ISBN');

	for (const isbn of ['9780441172719', '9780306406157', '9780553380163']) {
		await add.getByLabel('ISBN').fill(isbn);
		await add.getByRole('button', { name: 'Find' }).click();
	}
	await expect(add.getByText('Gödel, Escher, Bach')).toBeVisible();
	await expect(add.getByText('no match found')).toBeVisible();

	await add.getByRole('button', { name: 'Add all (2)' }).click();
	// each add may wait on a (real) cover download
	await expect(add.getByText('Added ✓')).toHaveCount(2, { timeout: 30_000 });
	await add.getByRole('button', { name: 'Done' }).click();
	await expect(page.getByRole('link', { name: 'Dune' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Gödel, Escher, Bach' })).toBeVisible();
});
