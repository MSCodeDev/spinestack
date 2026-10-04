import fs from 'node:fs';
import bwipjs from 'bwip-js';
import sharp from 'sharp';

export const BARCODE_ISBN = '9780441172719';
export const BARCODE_VIDEO = 'e2e/.tmp/barcode.y4m';

/** A short Y4M clip of one ISBN barcode, used as the fake camera feed. */
export default async function globalSetup() {
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
