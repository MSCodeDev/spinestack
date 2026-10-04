import { expect, test } from '@playwright/test';
import { addBook, login, resetLibrary } from './helpers';

test.beforeEach(resetLibrary);

test('filters, grouping and view modes', async ({ page }) => {
	await login(page);
	await addBook(page, {
		title: 'Dune',
		author: 'Frank Herbert',
		publisher: 'Ace',
		location: 'Study',
		pages: '400',
		paid: '10'
	});
	await addBook(page, {
		title: 'Emma',
		author: 'Jane Austen',
		publisher: 'Penguin',
		location: 'Hall',
		pages: '250',
		paid: '5'
	});
	await addBook(page, {
		title: 'Hobbit',
		author: 'J.R.R. Tolkien',
		publisher: 'Ace',
		location: 'Study',
		wishlist: true
	});

	await page.getByRole('button', { name: 'Filters' }).click();
	const panel = page.getByRole('dialog', { name: 'Filters & sorting' });

	// group by publisher
	await panel.getByLabel('Group by').selectOption('publisher');
	await expect(page).toHaveURL(/group=publisher/);
	await expect(page.getByRole('heading', { name: /^Ace/ })).toBeVisible();
	await expect(page.getByRole('heading', { name: /^Penguin/ })).toBeVisible();

	// filter by status, then drop it through the chip
	await panel.getByLabel(/^Status/).selectOption('wishlist');
	await expect(page).toHaveURL(/status=wishlist/);
	await panel.getByRole('button', { name: 'Done' }).click();
	await expect(page.getByRole('link', { name: 'Emma' })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Hobbit' })).toBeVisible();
	await page.getByRole('button', { name: 'Remove filter Status: wishlist' }).click();
	await expect(page.getByRole('link', { name: 'Emma' })).toBeVisible();

	// field search
	await page.getByRole('button', { name: 'Filters' }).click();
	await panel.getByRole('textbox', { name: 'Author', exact: true }).fill('tolkien');
	await expect(page).toHaveURL(/qa=tolkien/);
	await expect(page.getByRole('link', { name: 'Emma' })).toHaveCount(0);
	await panel.getByRole('textbox', { name: 'Author', exact: true }).fill('');
	await expect(page).not.toHaveURL(/qa=/);

	// entity filter and price range
	await panel.getByPlaceholder('Any location').fill('Study');
	await panel.getByPlaceholder('Any location').press('Enter');
	await expect(page).toHaveURL(/location=Study/);
	await panel.getByLabel('Paid at least').fill('6');
	await expect(page).toHaveURL(/min=6/);
	await panel.getByRole('button', { name: 'Done' }).click();
	await expect(page.getByRole('link', { name: 'Dune' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Hobbit' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Clear all' }).click();
	await expect(page.getByRole('link', { name: 'Hobbit' })).toBeVisible();

	// table view with sortable headers
	await page.getByRole('button', { name: 'Table' }).click();
	await expect(page).toHaveURL(/view=table/);
	await expect(page.getByRole('table')).toBeVisible();
	await page.getByRole('button', { name: 'Pages' }).click();
	await expect(page).toHaveURL(/sort=pages%3Adesc/);
	await page.getByRole('button', { name: 'Pages' }).click();
	await expect(page).toHaveURL(/sort=pages%3Aasc/);

	// stacked view
	await page.getByRole('button', { name: 'Stacked' }).click();
	await expect(page).toHaveURL(/view=stacked/);
	await expect(page.getByRole('link', { name: 'Dune' })).toBeVisible();

	// back to covers drops the param
	await page.getByRole('button', { name: 'Covers' }).click();
	await expect(page).not.toHaveURL(/view=/);

	// opening a book keeps the list params
	await page.getByRole('link', { name: 'Dune' }).click();
	await expect(page).toHaveURL(/group=publisher.*book=|book=.*group=publisher/);
});
