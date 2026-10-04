/** Hues (oklch) picked to sit well together on the warm paper background. */
const HUES = [25, 50, 85, 150, 185, 235, 285, 335];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** A stable colour pair for a book that has no cover, derived from its title. */
export function placeholderColors(title: string) {
	const hue = HUES[hash(title) % HUES.length];
	return {
		bg: `oklch(0.78 0.1 ${hue})`,
		bgDeep: `oklch(0.68 0.12 ${hue})`,
		ink: `oklch(0.28 0.05 ${hue})`
	};
}

/** Dark or light text for a #rrggbb background, whichever reads better. */
export function readableInk(hex: string): string {
	const n = parseInt(hex.replace('#', ''), 16);
	if (!Number.isFinite(n)) return 'oklch(0.28 0.03 50)';
	const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.6 ? 'oklch(0.25 0.03 50)' : 'oklch(0.98 0.01 85)';
}
