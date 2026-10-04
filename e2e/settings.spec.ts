import { expect, test } from '@playwright/test';
import { admin, login, openManualAdd, resetLibrary } from './helpers';

test.beforeEach(resetLibrary);

test('preferences apply and persist', async ({ page }) => {
	await login(page);
	await page.getByRole('link', { name: 'Settings' }).click();
	const settings = page.getByRole('dialog', { name: 'Settings' });
	await expect(page).toHaveURL(/settings=preferences/);

	// theme applies immediately and survives a reload without a flash (server-rendered class)
	await settings.getByLabel('Theme').selectOption('dark');
	await expect(page.locator('html')).toHaveClass(/dark/);
	await page.reload();
	await expect(page.locator('html')).toHaveClass(/dark/);
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	await page.getByRole('dialog', { name: 'Settings' }).getByLabel('Theme').selectOption('light');
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
	await expect(add.getByLabel('Currency')).toHaveValue('EUR');
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
