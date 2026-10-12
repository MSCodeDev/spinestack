import fs from 'node:fs';
import Database from 'better-sqlite3';
import { expect, type Page } from '@playwright/test';

export const admin = { name: 'Admin', email: 'admin@example.com', password: 'supersecret1' };

/** Sign in, creating the admin first when this is a fresh database. */
export async function login(page: Page) {
	await page.goto('/');
	await page.waitForURL(/\/(setup|login)$/);
	if (page.url().endsWith('/setup')) {
		await page.getByLabel('Name').fill(admin.name);
		await page.getByLabel('Email').fill(admin.email);
		await page.getByLabel('Password').fill(admin.password);
		await page.getByRole('button', { name: 'Create account' }).click();
	} else {
		await page.getByLabel('Email').fill(admin.email);
		await page.getByLabel('Password').fill(admin.password);
		await page.getByRole('button', { name: 'Sign in' }).click();
	}
	await expect(page.getByRole('link', { name: 'Add book' })).toBeVisible();
}

type NewBook = {
	title: string;
	author: string;
	publisher?: string;
	location?: string;
	pages?: string;
	paid?: string;
};

/** Open the Add book modal on its Manual tab. */
export async function openManualAdd(page: Page) {
	await page.getByRole('link', { name: 'Add book' }).click();
	const dialog = page.getByRole('dialog', { name: 'Add book' });
	await dialog.getByRole('tab', { name: 'Manual' }).click();
	return dialog;
}

export async function addBook(page: Page, book: NewBook) {
	const dialog = await openManualAdd(page);
	await dialog.getByLabel('Title', { exact: true }).fill(book.title);
	await dialog.getByPlaceholder('Add author').fill(book.author);
	await dialog.getByPlaceholder('Add author').press('Enter');
	if (book.publisher) await dialog.getByLabel('Publisher').fill(book.publisher);
	if (book.location) await dialog.getByLabel('Location').fill(book.location);
	if (book.pages) await dialog.getByLabel('Pages').fill(book.pages);
	if (book.paid) await dialog.getByLabel('Price').fill(book.paid);
	await dialog.getByRole('button', { name: 'Add book' }).click();
	const view = page.getByRole('dialog', { name: book.title });
	await expect(view).toBeVisible();
	await view.getByRole('button', { name: 'Close' }).click();
	await expect(view).toBeHidden();
}

/** Remove all books and their entities so each test starts from an empty library. */
export function resetLibrary() {
	const file = '.e2e-data/spinestack.db';
	if (!fs.existsSync(file)) return;
	const db = new Database(file);
	try {
		db.exec(`
			delete from book; delete from book_fts;
			delete from person; delete from publisher; delete from series; delete from tag; delete from location;
			delete from user_preference;
			update user set name = 'Admin';
			delete from user where email != 'admin@example.com';
			update user set role = 'admin';
		`);
	} catch {
		// tables are created on first request; nothing to reset yet
	} finally {
		db.close();
	}
}
