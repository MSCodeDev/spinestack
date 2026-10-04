import fs from 'node:fs';
import Database from 'better-sqlite3';
import { chromium } from '@playwright/test';
import bwipjs from 'bwip-js';
import sharp from 'sharp';

export const BARCODE_ISBN = '9780441172719';
export const BARCODE_VIDEO = 'e2e/.tmp/barcode.y4m';

/** A short Y4M clip of one ISBN barcode, used as the fake camera feed. */
export default async function globalSetup() {
	await warmUp();

	const [width, height] = [640, 480];
	const barcode = await bwipjs.toBuffer({
		bcid: 'ean13',
		text: BARCODE_ISBN,
		scale: 3,
		height: 25
	});
	const bars = await sharp(barcode)
		.flatten({ background: '#ffffff' })
		.resize({ width: 440, kernel: 'nearest' })
		.png()
		.toBuffer();
	const { data, info } = await sharp({
		create: { width, height, channels: 3, background: '#ffffff' }
	})
		.composite([{ input: bars, gravity: 'centre' }])
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	if (info.width !== width || info.height !== height || info.channels !== 3) {
		throw new Error(`Unexpected frame ${info.width}x${info.height}x${info.channels}`);
	}

	// RGB to planar I420 (BT.601)
	const y = Buffer.alloc(width * height);
	const u = Buffer.alloc((width * height) / 4);
	const v = Buffer.alloc((width * height) / 4);
	for (let row = 0; row < height; row++) {
		for (let col = 0; col < width; col++) {
			const i = (row * width + col) * 3;
			const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
			y[row * width + col] = 16 + (65.481 * r + 128.553 * g + 24.966 * b) / 255;
			if (row % 2 === 0 && col % 2 === 0) {
				const c = (row / 2) * (width / 2) + col / 2;
				u[c] = 128 + (-37.797 * r - 74.203 * g + 112 * b) / 255;
				v[c] = 128 + (112 * r - 93.786 * g - 18.214 * b) / 255;
			}
		}
	}

	const frame = Buffer.concat([Buffer.from('FRAME\n'), y, u, v]);
	const header = Buffer.from(`YUV4MPEG2 W${width} H${height} F30:1 Ip A1:1 C420jpeg\n`);
	fs.mkdirSync('e2e/.tmp', { recursive: true });
	fs.writeFileSync(BARCODE_VIDEO, Buffer.concat([header, ...Array(10).fill(frame)]));
}

/**
 * The dev server compiles routes and optimises dependencies on first use, which can outlast a
 * test's timeout. Visit the heavy pages once in a throwaway session, then wipe the users again so
 * the first test still sees a fresh install.
 */
async function warmUp() {
	const base = 'http://localhost:5174';
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.goto(`${base}/setup`);
		await page.getByLabel('Name').fill('Warmup');
		await page.getByLabel('Email').fill('warmup@example.com');
		await page.getByLabel('Password').fill('warmup-secret-1');
		await page.getByRole('button', { name: 'Create account' }).click();
		await page.waitForURL(`${base}/`, { timeout: 120_000 });
		for (const path of ['/', '/?view=table', '/?view=stacked', '/?add', '/?settings=library']) {
			await page.goto(`${base}${path}`);
			await page.waitForLoadState('networkidle', { timeout: 120_000 });
		}
	} finally {
		await browser.close();
	}

	const db = new Database('.e2e-data/spinestack.db');
	db.exec('delete from user');
	db.close();
}
