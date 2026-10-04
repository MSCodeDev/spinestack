import { expect, test } from '@playwright/test';
import { addBook, login, openManualAdd, resetLibrary } from './helpers';

test.beforeEach(resetLibrary);

test('fields suggest existing names', async ({ page }) => {
	await login(page);
	await addBook(page, {
		title: 'Dune',
		author: 'Frank Herbert',
		publisher: 'Ace',
		location: 'Study – Shelf 2'
	});

	const add = await openManualAdd(page);

	// single-value field: type, move with the keyboard, pick with Enter
	await add.getByLabel('Location').fill('shelf');
	const options = add.getByRole('listbox').getByRole('option');
	await expect(options).toHaveText(['Study – Shelf 2']);
	await add.getByLabel('Location').press('ArrowDown');
	await add.getByLabel('Location').press('Enter');
	await expect(add.getByLabel('Location')).toHaveValue('Study – Shelf 2');
	await expect(options).toHaveCount(0);

	// an exact match is not suggested again, and Escape closes the list without closing the modal
	await add.getByLabel('Publisher').fill('a');
	await expect(add.getByRole('listbox').getByRole('option', { name: 'Ace' })).toBeVisible();
	await add.getByLabel('Publisher').press('Escape');
	await expect(options).toHaveCount(0);
	await expect(add).toBeVisible();

	// chip field: click a suggestion to add it as a chip
	await add.getByPlaceholder('Add author').fill('fran');
	await add.getByRole('listbox').getByRole('option', { name: 'Frank Herbert' }).click();
	await expect(add.getByRole('button', { name: 'Remove Frank Herbert' })).toBeVisible();
	await expect(add.getByPlaceholder('Add author')).toHaveValue('');

	// removing the chip with its button
	await add.getByRole('button', { name: 'Remove Frank Herbert' }).click();
	await expect(add.getByRole('button', { name: 'Remove Frank Herbert' })).toHaveCount(0);
});
