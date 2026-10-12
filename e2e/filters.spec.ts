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
		location: 'Study'
	});

	// the filters sit inline under the toolbar and the button shows and hides them
	const toggle = page.getByRole('button', { name: 'Filters' });
	const panel = page.getByRole('region', { name: 'Filters' });
	await expect(panel).toHaveCount(0);
	await toggle.click();
	await expect(panel).toBeVisible();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	await toggle.click();
	await expect(panel).toHaveCount(0);
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await toggle.click();
	await expect(panel).toBeVisible();

	// group by publisher
	await page.getByLabel('Group by').selectOption('publisher');
	await expect(page).toHaveURL(/group=publisher/);
	await expect(page.getByRole('heading', { name: /^Ace/ })).toBeVisible();
	await expect(page.getByRole('heading', { name: /^Penguin/ })).toBeVisible();

	// filter by publisher, then drop it through the chip
	await panel.getByPlaceholder('Any publisher').fill('Penguin');
	await panel.getByPlaceholder('Any publisher').press('Enter');
	await expect(page).toHaveURL(/publisher=Penguin/);
	await expect(page.getByRole('link', { name: 'Dune' })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Emma' })).toBeVisible();
	await page.getByRole('button', { name: 'Remove filter publisher: Penguin' }).click();
	await expect(page.getByRole('link', { name: 'Dune' })).toBeVisible();

	// price slider: dragging the lower handle up filters out cheaper books
	const slider = panel.getByRole('slider');
	await expect(slider).toHaveCount(4); // two handles each for price and date
	await slider.first().focus();
	await page.keyboard.press('End');
	await expect(page).toHaveURL(/price=/);
	await expect(page.getByRole('link', { name: 'Emma' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Clear all' }).click();
	await expect(page.getByRole('link', { name: 'Emma' })).toBeVisible();

	// the date slider (date added) works the same way
	await slider.nth(2).focus();
	await page.keyboard.press('End');
	await expect(page).toHaveURL(/date=/);
	await page.getByRole('button', { name: 'Clear all' }).click();

	// entity filter
	await panel.getByPlaceholder('Any location').fill('Study');
	await panel.getByPlaceholder('Any location').press('Enter');
	await expect(page).toHaveURL(/location=Study/);
	await expect(page.getByRole('link', { name: 'Dune' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Emma' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Clear all' }).click();
	await expect(page.getByRole('link', { name: 'Emma' })).toBeVisible();

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
