import { expect, test } from '@playwright/test';
import { addBook, login, resetLibrary } from './helpers';

test.beforeEach(resetLibrary);

test('administrators manage users', async ({ page, browser, baseURL }) => {
	await login(page);
	await addBook(page, { title: 'Admin Book', author: 'A. Author' });

	await page.getByRole('link', { name: 'Settings' }).click();
	const settings = page.getByRole('dialog', { name: 'Settings' });
	await settings.getByRole('tab', { name: 'Users' }).click();
	await expect(settings.getByText('(you)')).toBeVisible();
	// you cannot delete or demote yourself: no controls on your own row
	await expect(settings.getByRole('button', { name: 'Delete Admin' })).toHaveCount(0);

	// create a user; short passwords and duplicate emails are rejected
	await settings.getByLabel('Name', { exact: true }).fill('Reader');
	await settings.getByLabel('Email').fill('reader@example.com');
	await settings.getByLabel('Password', { exact: true }).fill('short');
	await settings.getByRole('button', { name: 'Create user' }).click();
	await expect(settings.getByLabel('Password', { exact: true })).toHaveJSProperty(
		'validity.valid',
		false
	);

	await settings.getByLabel('Password', { exact: true }).fill('reader-secret-1');
	await settings.getByRole('button', { name: 'Create user' }).click();
	await expect(settings.getByText('reader@example.com')).toBeVisible();

	await settings.getByLabel('Name', { exact: true }).fill('Reader Again');
	await settings.getByLabel('Email').fill('reader@example.com');
	await settings.getByLabel('Password', { exact: true }).fill('reader-secret-1');
	await settings.getByRole('button', { name: 'Create user' }).click();
	await expect(settings.getByRole('alert')).toBeVisible();

	// the new user has their own empty library and no admin tools
	const reader = await browser.newContext({ baseURL });
	const readerPage = await reader.newPage();
	await readerPage.goto('/login');
	await readerPage.getByLabel('Email').fill('reader@example.com');
	await readerPage.getByLabel('Password').fill('reader-secret-1');
	await readerPage.getByRole('button', { name: 'Sign in' }).click();
	await expect(readerPage.getByText("Let's fill these shelves!")).toBeVisible();
	await expect(readerPage.getByText('Admin Book')).toHaveCount(0);
	await readerPage.getByRole('link', { name: 'Settings' }).click();
	const readerSettings = readerPage.getByRole('dialog', { name: 'Settings' });
	await expect(readerSettings.getByRole('tab', { name: 'Account' })).toBeVisible();
	await expect(readerSettings.getByRole('tab', { name: 'Users' })).toHaveCount(0);
	const forbidden = await readerPage.request.get('/api/settings/users');
	expect(forbidden.status()).toBe(403);
	const forbiddenDelete = await readerPage.request.delete('/api/settings/users?id=x');
	expect(forbiddenDelete.status()).toBe(403);

	// promote, then reset the password
	await settings.getByRole('button', { name: 'Make admin' }).click();
	await expect(settings.getByRole('button', { name: 'Make user' })).toBeVisible();
	await readerPage.reload();
	await readerPage.getByRole('link', { name: 'Settings' }).click();
	await expect(
		readerPage.getByRole('dialog', { name: 'Settings' }).getByRole('tab', { name: 'Users' })
	).toBeVisible();
	await settings.getByRole('button', { name: 'Make user' }).click();
	await expect(settings.getByRole('button', { name: 'Make admin' })).toBeVisible();

	await settings.getByRole('button', { name: 'Reset password' }).click();
	await settings.getByLabel('New password for Reader').fill('reader-secret-2');
	await settings.getByRole('button', { name: 'Set', exact: true }).click();
	await expect(page.getByText('Password reset').last()).toBeVisible();
	await reader.close();

	const again = await browser.newContext({ baseURL });
	const againPage = await again.newPage();
	await againPage.goto('/login');
	await againPage.getByLabel('Email').fill('reader@example.com');
	await againPage.getByLabel('Password').fill('reader-secret-2');
	await againPage.getByRole('button', { name: 'Sign in' }).click();
	await expect(againPage.getByText("Let's fill these shelves!")).toBeVisible();
	await again.close();

	// delete the user
	await settings.getByRole('button', { name: 'Delete Reader' }).click();
	await page
		.getByRole('alertdialog', { name: 'Are you sure?' })
		.getByRole('button', { name: 'Delete' })
		.click();
	await expect(settings.getByText('reader@example.com')).toHaveCount(0);
});
