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

test('search for a cover and pick one', async ({ page }) => {
	await login(page);
	await addBook(page, { title: 'Dune', author: 'Frank Herbert' });

	const png = await sharp({
		create: { width: 40, height: 60, channels: 3, background: '#c03020' }
	})
		.png()
		.toBuffer();
	const image = `data:image/png;base64,${png.toString('base64')}`;
	const asked: string[] = [];
	await page.route('**/api/covers/search?*', (route) => {
		asked.push(new URL(route.request().url()).search);
		return route.fulfill({
			json: {
				candidates: [
					{ url: image, label: 'Dune – Frank Herbert', source: 'openlibrary' },
					{ url: 'data:image/png;base64,AAAA', label: 'Broken one', source: 'googlebooks' },
					{ url: `${image}#2`, label: 'Dune (2nd)', source: 'googlebooks' }
				]
			}
		});
	});

	await page.getByRole('link', { name: 'Dune' }).click();
	const dialog = page.getByRole('dialog', { name: 'Dune' });
	await dialog.getByRole('button', { name: 'Find cover' }).click();

	const search = page.getByRole('dialog', { name: 'Find a cover' });
	await expect(search.getByRole('textbox')).toHaveValue('Dune Frank Herbert');
	expect(asked[0]).toContain('q=Dune+Frank+Herbert');

	// images that fail to load are hidden
	await expect(search.getByRole('button', { name: /^Use cover/ })).toHaveCount(2);
	await expect(search.getByRole('button', { name: 'Use cover: Broken one' })).toHaveCount(0);

	// the search can be refined
	await search.getByRole('textbox').fill('dune messiah');
	await search.getByRole('button', { name: 'Search' }).click();
	await expect.poll(() => asked.at(-1)).toContain('q=dune+messiah');

	// the server only downloads from known cover hosts, and says so
	await search.getByRole('button', { name: 'Use cover: Dune – Frank Herbert' }).click();
	await expect(page.getByText('Image host is not allowed.')).toBeVisible();
	await expect(search).toBeVisible();
});
