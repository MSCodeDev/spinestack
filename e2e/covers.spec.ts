import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { addBook, login, resetLibrary } from './helpers';

test.beforeEach(resetLibrary);

test('upload, show and remove a cover', async ({ page }) => {
	await login(page);
	await addBook(page, { title: 'Dune', author: 'Frank Herbert' });
	await page.getByRole('link', { name: 'Dune' }).click();
	const dialog = page.getByRole('dialog', { name: 'Dune' });

	// invalid files are rejected with a message
	await dialog
		.getByLabel('Upload cover')
		.setInputFiles({ name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('nope') });
	await expect(page.getByText('Not a valid image.')).toBeVisible();

	const png = await sharp({
		create: { width: 400, height: 600, channels: 3, background: '#2040c0' }
	})
		.png()
		.toBuffer();
	await dialog
		.getByLabel('Upload cover')
		.setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png });

	const cover = dialog.getByRole('img', { name: 'Cover of Dune' });
	await expect(cover).toBeVisible();
	await expect
		.poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBeGreaterThan(0);

	// the list shows the thumbnail
	await dialog.getByRole('button', { name: 'Close' }).click();
	const card = page.getByRole('link', { name: 'Dune' }).locator('img');
	await expect(card).toHaveAttribute('src', /\/covers\/.+\/256\?v=1/);
	await expect
		.poll(() => card.evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBeGreaterThan(0);

	// remove it again
	await page.getByRole('link', { name: 'Dune' }).click();
	await dialog.getByRole('button', { name: 'Remove' }).click();
	await expect(dialog.getByRole('img', { name: 'Cover of Dune' })).toHaveCount(0);
});
