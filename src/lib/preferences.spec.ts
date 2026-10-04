import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, normalizePreferences, parsePreferencesPatch } from './preferences';

describe('normalizePreferences', () => {
	it('returns defaults for empty input', () => {
		expect(normalizePreferences({})).toEqual(DEFAULT_PREFERENCES);
	});

	it('accepts valid values, normalising case and numeric strings', () => {
		expect(
			normalizePreferences({
				currency: 'eur',
				defaultView: 'table',
				pageSize: '120',
				theme: 'dark'
			})
		).toEqual({ currency: 'EUR', defaultView: 'table', pageSize: 120, theme: 'dark' });
	});

	it('falls back per field for invalid values', () => {
		expect(
			normalizePreferences({ currency: 'dollars', defaultView: 'grid', pageSize: 7, theme: 'neon' })
		).toEqual(DEFAULT_PREFERENCES);
		expect(normalizePreferences({ currency: 'GBP', theme: 'nope' })).toMatchObject({
			currency: 'GBP',
			theme: 'system'
		});
	});
});

describe('parsePreferencesPatch', () => {
	it('keeps only valid fields', () => {
		expect(
			parsePreferencesPatch({ currency: 'gbp', pageSize: '30', theme: 'neon', extra: 1 })
		).toEqual({
			currency: 'GBP',
			pageSize: 30
		});
		expect(parsePreferencesPatch({})).toEqual({});
	});
});
