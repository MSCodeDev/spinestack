import { VIEWS, type View } from './library/query.js';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const PAGE_SIZES = [30, 60, 120] as const;

export type Preferences = {
	/** ISO 4217 code used to prefill prices on new books. */
	currency: string;
	defaultView: View;
	pageSize: (typeof PAGE_SIZES)[number];
	theme: Theme;
};

export const DEFAULT_PREFERENCES: Preferences = {
	currency: 'USD',
	defaultView: 'covers',
	pageSize: 60,
	theme: 'system'
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
		theme: THEMES.includes(raw.theme as Theme) ? (raw.theme as Theme) : d.theme
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
	return patch;
}
