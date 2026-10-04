import { describe, expect, it } from 'vitest';
import { parseDateRange, parsePriceRange } from './ranges';

describe('parsePriceRange', () => {
	it('reads a single amount as exact and ranges as bounds', () => {
		expect(parsePriceRange('12.50')).toEqual({ min: 12.5, max: 12.5 });
		expect(parsePriceRange('12,5')).toEqual({ min: 12.5, max: 12.5 });
		expect(parsePriceRange('10-20')).toEqual({ min: 10, max: 20 });
		expect(parsePriceRange(' 10 – 20.5 ')).toEqual({ min: 10, max: 20.5 });
		expect(parsePriceRange('10..20')).toEqual({ min: 10, max: 20 });
		expect(parsePriceRange('10 to 20')).toEqual({ min: 10, max: 20 });
		expect(parsePriceRange('10-')).toEqual({ min: 10, max: null });
		expect(parsePriceRange('-20')).toEqual({ min: null, max: 20 });
	});

	it('returns null for empty or unclear text', () => {
		for (const bad of ['', '  ', '-', 'abc', '10-20-30', '$10', '1e3']) {
			expect(parsePriceRange(bad)).toBeNull();
		}
	});
});

describe('parseDateRange', () => {
	it('expands a partial date to the whole period', () => {
		expect(parseDateRange('2024')).toEqual({ from: '2024-01-01', to: '2024-12-31' });
		expect(parseDateRange('2024-03')).toEqual({ from: '2024-03-01', to: '2024-03-31' });
		expect(parseDateRange('2024-03-15')).toEqual({ from: '2024-03-15', to: '2024-03-15' });
	});

	it('reads ranges, open on either side', () => {
		expect(parseDateRange('2024-01..2024-06')).toEqual({ from: '2024-01-01', to: '2024-06-31' });
		expect(parseDateRange('2023 to 2024')).toEqual({ from: '2023-01-01', to: '2024-12-31' });
		expect(parseDateRange('2024-05..')).toEqual({ from: '2024-05-01', to: null });
		expect(parseDateRange('..2023-06')).toEqual({ from: null, to: '2023-06-31' });
	});

	it('returns null for unclear text', () => {
		for (const bad of ['', '24', '2024-1', 'yesterday', '..', '2024-03-15-01']) {
			expect(parseDateRange(bad)).toBeNull();
		}
	});
});
