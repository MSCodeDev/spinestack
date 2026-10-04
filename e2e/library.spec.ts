import { expect, test } from '@playwright/test';

test('setup, add, edit and delete a book', async ({ page }) => {
	// first run: setup creates the admin
	await page.goto('/');
	await expect(page).toHaveURL(/\/setup$/);
	await page.getByLabel('Name').fill('Admin');
	await page.getByLabel('Email').fill('admin@example.com');
	await page.getByLabel('Password').fill('supersecret1');
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByRole('link', { name: 'Add book' })).toBeVisible();

	// add a book
	await page.getByRole('link', { name: 'Add book' }).click();
	const add = page.getByRole('dialog', { name: 'Add book' });
	await add.getByLabel('Title', { exact: true }).fill('Dune');
	await add.getByPlaceholder('Add author').fill('Frank Herbert');
	await add.getByPlaceholder('Add author').press('Enter');
	await add.getByLabel('ISBN').fill('0-306-40615-2');
	await add.getByLabel('Location').fill('Study – Shelf 2');
	await add.getByRole('button', { name: 'Add book' }).click();

	const view = page.getByRole('dialog', { name: 'Dune' });
	await expect(view.getByText('Frank Herbert')).toBeVisible();
	await expect(view.getByText('9780306406157')).toBeVisible();
	await expect(view.getByText('Study – Shelf 2')).toBeVisible();

	// closing and reopening a modal does not refetch the list
	await view.getByRole('button', { name: 'Close' }).click();
	await expect(page).not.toHaveURL(/book=/);
	let dataRequests = 0;
	page.on('request', (r) => r.url().includes('__data.json') && dataRequests++);
	await page.getByRole('link', { name: 'Dune' }).click();
	await expect(page.getByRole('dialog', { name: 'Dune' })).toBeVisible();
	expect(dataRequests).toBe(0);

	// duplicate ISBN is rejected
	await page.keyboard.press('Escape');
	await page.getByRole('link', { name: 'Add book' }).click();
	await add.getByLabel('Title', { exact: true }).fill('Dune again');
	await add.getByLabel('ISBN').fill('9780306406157');
	await add.getByRole('button', { name: 'Add book' }).click();
	await expect(add.getByRole('alert')).toContainText('already exists');
	await add.getByRole('button', { name: 'Cancel' }).click();

	// edit
	await page.getByRole('link', { name: 'Dune' }).click();
	await page.getByRole('dialog', { name: 'Dune' }).getByRole('button', { name: 'Edit' }).click();
	await page.getByLabel('Title', { exact: true }).fill('Dune Messiah');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('dialog', { name: 'Dune Messiah' })).toBeVisible();

	// delete
	await page.getByRole('button', { name: 'Delete' }).click();
	await page
		.getByRole('dialog', { name: 'Are you sure?' })
		.getByRole('button', { name: 'Delete' })
		.click();
	await expect(page.getByRole('link', { name: 'Dune Messiah' })).toHaveCount(0);
	await expect(page.getByText('No books yet.')).toBeVisible();
});
