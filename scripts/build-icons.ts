// Draws the header logo (see Wordmark.svelte) as the favicon and the PWA icons.
// Run with `npm run icons` and commit the output.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');

// Default coral accent and cream background from src/routes/layout.css.
const PRIMARY = '#e45937';
const FOREGROUND = '#fffbf4';
const BACKGROUND = '#fefaf1';

// First frame of the `morph` keyframes: horizontal radii / vertical radii, top-left clockwise.
const RADII = { h: [0.63, 0.37, 0.54, 0.46], v: [0.55, 0.48, 0.52, 0.45] };

// Lucide "library-big", drawn on a 24 grid.
const ICON = `<rect width="8" height="18" x="3" y="3" rx="1"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/>`;

const round = (n: number) => Math.round(n * 100) / 100;

function blobPath(s: number): string {
	const [htl, htr, hbr, hbl] = RADII.h.map((r) => round(r * s));
	const [vtl, vtr, vbr, vbl] = RADII.v.map((r) => round(r * s));
	return [
		`M${htl} 0H${round(s - htr)}A${htr} ${vtr} 0 0 1 ${s} ${vtr}V${round(s - vbr)}`,
		`A${hbr} ${vbr} 0 0 1 ${round(s - hbr)} ${s}H${hbl}A${hbl} ${vbl} 0 0 1 0 ${round(s - vbl)}`,
		`V${vtl}A${htl} ${vtl} 0 0 1 ${htl} 0Z`
	].join('');
}

/** The logo on a square canvas: `fill` is the blob's share of the canvas, `background` optional. */
function logo(size: number, fill: number, iconShare = 0.56, background?: string): string {
	const blob = round(size * fill);
	const offset = round((size - blob) / 2);
	const k = round((blob * iconShare) / 24);
	const mid = round(blob / 2);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${
		background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''
	}<g transform="translate(${offset} ${offset}) rotate(-6 ${mid} ${mid})"><path d="${blobPath(blob)}" fill="${PRIMARY}"/><g transform="translate(${round(mid - 12 * k)} ${round(mid - 12 * k)}) scale(${k})" fill="none" stroke="${FOREGROUND}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON}</g></g></svg>\n`;
}

const png = (file: string, svg: string) =>
	sharp(Buffer.from(svg))
		.png()
		.toFile(path.join(root, 'static', file));

fs.writeFileSync(path.join(root, 'src/lib/assets/favicon.svg'), logo(64, 0.96, 0.6));

await Promise.all([
	png('icon-192.png', logo(192, 0.92)),
	png('icon-512.png', logo(512, 0.92)),
	// Maskable icons get cropped to a shape, so keep the logo in the middle on a solid background.
	png('icon-maskable-512.png', logo(512, 0.56, 0.56, BACKGROUND)),
	// iOS ignores the manifest and fills transparency with black.
	png('apple-touch-icon.png', logo(180, 0.7, 0.56, BACKGROUND))
]);
