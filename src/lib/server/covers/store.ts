import fs from 'node:fs/promises';
import path from 'node:path';
import sharp, { type Metadata } from 'sharp';

export const COVER_SIZES = ['256', '512', 'full'] as const;
export type CoverSize = (typeof COVER_SIZES)[number];

const THUMBS = [256, 512] as const;
const MAX_SIDE = 1024;
const MIN_SIDE = 40;
const FORMATS = ['jpeg', 'png', 'webp', 'gif', 'avif'];

export class InvalidImageError extends Error {}

const hex = (n: number) => n.toString(16).padStart(2, '0');

/** Cover files on disk: `{id}.jpg` plus 256/512 px thumbnails. */
export function createCoverStore(dir: string) {
	const file = (id: string, size: CoverSize) =>
		path.join(dir, size === 'full' ? `${id}.jpg` : `${id}.${size}.jpg`);

	return {
		file,

		/** Normalise an uploaded or downloaded image to JPEG and write all sizes. Returns the dominant colour. */
		async save(id: string, input: Buffer): Promise<{ color: string }> {
			let meta: Metadata;
			try {
				meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
			} catch {
				throw new InvalidImageError('Not a valid image.');
			}
			if (!meta.format || !FORMATS.includes(meta.format)) {
				throw new InvalidImageError('Unsupported image format.');
			}
			if ((meta.width ?? 0) < MIN_SIDE || (meta.height ?? 0) < MIN_SIDE) {
				throw new InvalidImageError('Image is too small to be a cover.');
			}

			const base = sharp(input, { limitInputPixels: 50_000_000, animated: false })
				.rotate()
				.flatten({ background: '#ffffff' })
				.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true });
			const full = await base.clone().jpeg({ quality: 85, mozjpeg: true }).toBuffer();

			const { dominant } = await sharp(full).stats();

			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(file(id, 'full'), full);
			for (const width of THUMBS) {
				const thumb = await sharp(full)
					.resize({ width, withoutEnlargement: true })
					.jpeg({ quality: 80 })
					.toBuffer();
				await fs.writeFile(file(id, String(width) as CoverSize), thumb);
			}

			return { color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}` };
		},

		async remove(id: string) {
			await Promise.all(COVER_SIZES.map((size) => fs.rm(file(id, size), { force: true })));
		},

		async read(id: string, size: CoverSize): Promise<Buffer | null> {
			try {
				return await fs.readFile(file(id, size));
			} catch {
				return null;
			}
		}
	};
}

export type CoverStore = ReturnType<typeof createCoverStore>;
