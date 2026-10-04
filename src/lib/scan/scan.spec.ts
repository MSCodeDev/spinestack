import bwipjs from 'bwip-js';
import sharp from 'sharp';
import {
	BinaryBitmap,
	HybridBinarizer,
	MultiFormatReader,
	NotFoundException,
	RGBLuminanceSource
} from '@zxing/library';
import { describe, expect, it } from 'vitest';
import { decodeHints } from './decoder';
import { enqueue, isbnFromBarcode } from './isbn-scan';

describe('isbnFromBarcode', () => {
	it('accepts valid Bookland EAN-13 codes only', () => {
		expect(isbnFromBarcode('9780441172719')).toBe('9780441172719');
		expect(isbnFromBarcode(' 9780441172719 ')).toBe('9780441172719');
		expect(isbnFromBarcode('9780441172718')).toBeNull(); // bad checksum
		expect(isbnFromBarcode('4006381333931')).toBeNull(); // valid EAN, not a book
		expect(isbnFromBarcode('0441172717')).toBeNull(); // ISBN-10 is not an EAN-13
		expect(isbnFromBarcode('abc')).toBeNull();
	});
});

describe('enqueue', () => {
	it('adds new ISBNs as looking and ignores duplicates', () => {
		const once = enqueue([], '9780441172719');
		expect(once).toEqual([{ isbn: '9780441172719', status: 'looking' }]);
		expect(enqueue(once, '9780441172719')).toBe(once);
		expect(enqueue(once, '9780306406157')).toHaveLength(2);
	});
});

describe('barcode decoding', () => {
	async function decode(text: string, scale = 3) {
		const png = await bwipjs.toBuffer({ bcid: 'ean13', text, scale, height: 20 });
		const { data, info } = await sharp(png)
			.extend({ top: 30, bottom: 30, left: 40, right: 40, background: '#ffffff' })
			.flatten({ background: '#ffffff' })
			.greyscale()
			.raw()
			.toBuffer({ resolveWithObject: true });
		const source = new RGBLuminanceSource(new Uint8ClampedArray(data), info.width, info.height);
		const reader = new MultiFormatReader();
		reader.setHints(decodeHints());
		return reader.decode(new BinaryBitmap(new HybridBinarizer(source))).getText();
	}

	it('decodes an ISBN barcode with the production hints', async () => {
		expect(await decode('9780441172719')).toBe('9780441172719');
		expect(await decode('9780306406157', 2)).toBe('9780306406157');
	});

	it('finds nothing in a blank image', async () => {
		const blank = new RGBLuminanceSource(new Uint8ClampedArray(200 * 100).fill(255), 200, 100);
		const reader = new MultiFormatReader();
		reader.setHints(decodeHints());
		expect(() => reader.decode(new BinaryBitmap(new HybridBinarizer(blank)))).toThrow(
			NotFoundException
		);
	});
});
