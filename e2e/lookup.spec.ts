import { expect, test } from '@playwright/test';
import { login, resetLibrary } from './helpers';

test.beforeEach(resetLibrary);

const result = (over: object = {}) => ({
	source: 'openlibrary',
	title: 'Dune',
	subtitle: null,
	authors: ['Frank Herbert'],
	publisher: 'Ace',
	isbn: '9780441172719',
	pageCount: 412,
	synopsis: 'Spice.',
	language: 'en',
	// not an allowed host, so the automatic cover download fails without touching the network
	coverUrl: 'https://cover.invalid/dune.jpg',
	year: 1965,
	existingId: null,
	...over
});

test('add books from lookup results', async ({ page }) => {
	await login(page);

	let reply: object[] = [];
	const requests: string[] = [];
	await page.route('**/api/lookup?*', (route) => {
		requests.push(new URL(route.request().url()).search);
		return route.fulfill({ json: { results: reply } });
	});

	// search by title and author, then add in one click
	reply = [result(), result({ title: 'Dune Messiah', isbn: '9780441172696' })];
	await page.getByRole('link', { name: 'Add book' }).click();
	const add = page.getByRole('dialog', { name: 'Add book' });
	await add.getByLabel('Title').fill('dune');
	await add.getByLabel('Author').fill('herbert');
	await add.getByRole('button', { name: 'Search' }).click();
	await expect(add.getByText('Dune Messiah')).toBeVisible();
	expect(requests.at(-1)).toContain('title=dune');
	expect(requests.at(-1)).toContain('author=herbert');

	await add.getByRole('button', { name: 'Add', exact: true }).first().click();
	const view = page.getByRole('dialog', { name: 'Dune' });
	await expect(view.getByText('Frank Herbert').first()).toBeVisible();
	await expect(view.getByText('9780441172719')).toBeVisible();
	await expect(page.getByText('could not be downloaded')).toBeVisible();
	const bookId = new URL(page.url()).searchParams.get('book')!;
	await view.getByRole('button', { name: 'Close' }).click();

	// an ISBN already in the library is flagged, and links to the book
	reply = [result({ existingId: bookId })];
	await page.getByRole('link', { name: 'Add book' }).click();
	await add.getByRole('tab', { name: 'ISBN' }).click();
	await add.getByLabel('ISBN').fill('978-0-441-17271-9');
	await add.getByRole('button', { name: 'Find' }).click();
	await expect(add.getByRole('link', { name: 'In library' })).toBeVisible();
	expect(requests.at(-1)).toContain('isbn=9780441172719');
	await add.getByRole('link', { name: 'In library' }).click();
	await expect(page.getByRole('dialog', { name: 'Dune' })).toBeVisible();
	await page.getByRole('dialog', { name: 'Dune' }).getByRole('button', { name: 'Close' }).click();

	// review and edit a result before adding it
	reply = [result({ title: 'Children of Dune', isbn: '9780441104024', existingId: null })];
	await page.getByRole('link', { name: 'Add book' }).click();
	await add.getByLabel('Title').fill('children');
	await add.getByRole('button', { name: 'Search' }).click();
	await add.getByRole('button', { name: 'Edit first' }).click();
	await expect(add.getByLabel('Title', { exact: true })).toHaveValue('Children of Dune');
	await expect(add.getByLabel('ISBN')).toHaveValue('9780441104024');
	await add.getByLabel('Location').fill('Study');
	await add.getByRole('button', { name: 'Add book' }).click();
	await expect(
		page.getByRole('dialog', { name: 'Children of Dune' }).getByText('Study')
	).toBeVisible();
	await page
		.getByRole('dialog', { name: 'Children of Dune' })
		.getByRole('button', { name: 'Close' })
		.click();

	// no matches offers a manual add with the typed title
	reply = [];
	await page.getByRole('link', { name: 'Add book' }).click();
	await add.getByLabel('Title').fill('Obscure Pamphlet');
	await add.getByRole('button', { name: 'Search' }).click();
	await add.getByRole('button', { name: 'Add it manually' }).click();
	await expect(add.getByLabel('Title', { exact: true })).toHaveValue('Obscure Pamphlet');
});

test('lookup errors are shown', async ({ page }) => {
	await login(page);
	await page.route('**/api/lookup?*', (route) =>
		route.fulfill({
			status: 502,
			json: { message: 'Book lookup services are unavailable right now.' }
		})
	);
	await page.getByRole('link', { name: 'Add book' }).click();
	const add = page.getByRole('dialog', { name: 'Add book' });
	await add.getByLabel('Title').fill('dune');
	await add.getByRole('button', { name: 'Search' }).click();
	await expect(add.getByRole('alert')).toContainText('unavailable');
});
