import { VIEWS, type View } from './library/query.js';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Main colour choices; the colours themselves live in layout.css under [data-accent]. */
export const ACCENTS = ['coral', 'amber', 'green', 'teal', 'blue', 'violet', 'pink'] as const;
export type Accent = (typeof ACCENTS)[number];

export const PAGE_SIZES = [30, 60, 120] as const;

export type Preferences = {
	/** ISO 4217 code used to prefill prices on new books. */
	currency: string;
	defaultView: View;
	pageSize: (typeof PAGE_SIZES)[number];
	theme: Theme;
	/** Main colour used for buttons, highlights and focus rings. */
	accent: Accent;
	/** Seed for the generated avatar; empty means "use the user id", so everyone has one from the start. */
	avatarSeed: string;
};

export const DEFAULT_PREFERENCES: Preferences = {
	currency: 'USD',
	defaultView: 'covers',
	pageSize: 60,
	theme: 'system',
	accent: 'coral',
	avatarSeed: ''
};

const validSeed = (value: unknown) => {
	const seed = typeof value === 'string' ? value.trim() : '';
	return seed && seed.length <= 64 ? seed : null;
};

/** Coerce stored or submitted values into valid preferences, falling back to defaults per field. */
export function normalizePreferences(raw: Record<string, unknown>): Preferences {
	const d = DEFAULT_PREFERENCES;
	const currency = String(raw.currency ?? '').toUpperCase();
	const size = Number(raw.pageSize);
	return {
		currency: /^[A-Z]{3}$/.test(currency) ? currency : d.currency,
		defaultView: VIEWS.includes(raw.defaultView as View)
			? (raw.defaultView as View)
			: d.defaultView,
		pageSize: (PAGE_SIZES as readonly number[]).includes(size)
			? (size as Preferences['pageSize'])
			: d.pageSize,
		theme: THEMES.includes(raw.theme as Theme) ? (raw.theme as Theme) : d.theme,
		accent: ACCENTS.includes(raw.accent as Accent) ? (raw.accent as Accent) : d.accent,
		avatarSeed: validSeed(raw.avatarSeed) ?? d.avatarSeed
	};
}

/** Only the valid fields of a patch, so a bad value never overwrites a good one. */
export function parsePreferencesPatch(raw: Record<string, unknown>): Partial<Preferences> {
	const patch: Partial<Preferences> = {};
	const currency = String(raw.currency ?? '').toUpperCase();
	if (/^[A-Z]{3}$/.test(currency)) patch.currency = currency;
	if (VIEWS.includes(raw.defaultView as View)) patch.defaultView = raw.defaultView as View;
	if ((PAGE_SIZES as readonly number[]).includes(Number(raw.pageSize))) {
		patch.pageSize = Number(raw.pageSize) as Preferences['pageSize'];
	}
	if (THEMES.includes(raw.theme as Theme)) patch.theme = raw.theme as Theme;
	if (ACCENTS.includes(raw.accent as Accent)) patch.accent = raw.accent as Accent;
	const seed = validSeed(raw.avatarSeed);
	if (seed) patch.avatarSeed = seed;
	return patch;
}
