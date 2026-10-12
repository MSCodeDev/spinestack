import { expect, test } from '@playwright/test';
import { addBook, admin, login, openManualAdd, resetLibrary } from './helpers';

test.beforeEach(resetLibrary);

test('preferences apply and persist', async ({ page }) => {
	await login(page);
	await page.getByRole('link', { name: 'Settings' }).click();
	const settings = page.getByRole('dialog', { name: 'Settings' });
	await expect(page).toHaveURL(/settings=preferences/);

	// theme applies immediately and survives a reload without a flash (server-rendered class)
	await settings.getByRole('combobox', { name: 'Theme' }).selectOption('dark');
	await expect(page.locator('html')).toHaveClass(/dark/);
	await page.reload();
	await expect(page.locator('html')).toHaveClass(/dark/);
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	await settings.getByRole('combobox', { name: 'Theme' }).selectOption('light');
	await expect(page.locator('html')).not.toHaveClass(/dark/);

	// default view
	await settings.getByLabel('Default view').selectOption('table');
	await settings.getByRole('button', { name: 'Close' }).click();
	await page.goto('/');
	await page.waitForLoadState('networkidle'); // let the page hydrate before clicking
	await expect(page.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true');
	await page.getByRole('button', { name: 'Covers' }).click();
	await expect(page).toHaveURL(/view=covers/);

	// default currency prefills new books
	await page.getByRole('link', { name: 'Settings' }).click();
	await page
		.getByRole('dialog', { name: 'Settings' })
		.getByLabel('Currency for new books')
		.fill('eur');
	await page
		.getByRole('dialog', { name: 'Settings' })
		.getByLabel('Currency for new books')
		.press('Tab');
	await expect(page.getByText('Preferences saved').last()).toBeVisible();
	await page
		.getByRole('dialog', { name: 'Settings' })
		.getByRole('button', { name: 'Close' })
		.click();
	const add = await openManualAdd(page);
	await expect(add.getByText('EUR', { exact: true })).toBeVisible();
});

test('change name and password', async ({ page }) => {
	await login(page);
	await page.getByRole('link', { name: 'Settings' }).click();
	const settings = page.getByRole('dialog', { name: 'Settings' });
	await settings.getByRole('tab', { name: 'Account' }).click();
	await expect(page).toHaveURL(/settings=account/);

	await settings.getByLabel('Name').fill('Administrator');
	await settings.getByRole('button', { name: 'Save name' }).click();
	await expect(page.getByRole('link', { name: 'Settings' })).toContainText('Administrator');

	// wrong current password is rejected
	await settings.getByLabel('Current password').fill('not-the-password');
	await settings.getByLabel('New password', { exact: true }).fill('another-secret-2');
	await settings.getByLabel('Confirm new password').fill('another-secret-2');
	await settings.getByRole('button', { name: 'Change password' }).click();
	await expect(settings.getByRole('alert')).toBeVisible();

	// mismatched confirmation is caught before the request
	await settings.getByLabel('Current password').fill(admin.password);
	await settings.getByLabel('Confirm new password').fill('different');
	await settings.getByRole('button', { name: 'Change password' }).click();
	await expect(settings.getByRole('alert')).toContainText('do not match');

	// change it, then change it back so other tests can still sign in
	for (const [from, to] of [
		[admin.password, 'another-secret-2'],
		['another-secret-2', admin.password]
	]) {
		await settings.getByLabel('Current password').fill(from);
		await settings.getByLabel('New password', { exact: true }).fill(to);
		await settings.getByLabel('Confirm new password').fill(to);
		await settings.getByRole('button', { name: 'Change password' }).click();
		await expect(page.getByText('Password changed').last()).toBeVisible();
	}

	// sign out
	await settings.getByRole('button', { name: 'Sign out' }).click();
	await expect(page).toHaveURL(/\/login$/);
});

test('rename, merge and delete library entities', async ({ page }) => {
	await login(page);
	await addBook(page, { title: 'Dune', author: 'Frank Herbert', location: 'Study' });
	await addBook(page, { title: 'Emma', author: 'Jane Austen', location: 'Hall' });

	await page.getByRole('link', { name: 'Settings' }).click();
	const settings = page.getByRole('dialog', { name: 'Settings' });
	await settings.getByRole('tab', { name: 'Library' }).click();
	await expect(settings.getByText('Study')).toBeVisible();
	await expect(settings.getByText('Hall')).toBeVisible();

	// renaming to an existing name offers a merge
	await settings.getByRole('button', { name: 'Rename Hall' }).click();
	await settings.getByLabel('New name').fill('study');
	await settings.getByRole('button', { name: 'Save' }).click();
	const confirmDialog = page.getByRole('alertdialog', { name: 'Are you sure?' });
	await expect(confirmDialog).toContainText('already exists');
	await confirmDialog.getByRole('button', { name: 'Merge' }).click();
	await expect(settings.getByText('2 books')).toBeVisible();
	await expect(settings.getByText('Hall')).toHaveCount(0);

	// plain rename
	await settings.getByRole('button', { name: 'Rename Study' }).click();
	await settings.getByLabel('New name').fill('Office');
	await settings.getByRole('button', { name: 'Save' }).click();
	await expect(settings.getByText('Office')).toBeVisible();

	// deleting an author warns about the books that lose it
	await settings.getByRole('button', { name: 'Authors' }).click();
	await settings.getByRole('button', { name: 'Delete Jane Austen' }).click();
	await expect(confirmDialog).toContainText('used by 1 book');
	await confirmDialog.getByRole('button', { name: 'Delete' }).click();
	await expect(settings.getByText('Jane Austen')).toHaveCount(0);

	// the library reflects it
	await settings.getByRole('button', { name: 'Close' }).click();
	await page.getByPlaceholder('Search title').fill('austen');
	await expect(page.getByText('No books match')).toBeVisible();
	await page.getByPlaceholder('Search title').fill('office');
	await expect(page.getByRole('link', { name: 'Dune' })).toBeVisible();
});
