import { describe, expect, it } from 'vitest';
import { placeholderColors, readableInk } from './placeholder';

describe('placeholderColors', () => {
	it('is stable for a title and usually differs between titles', () => {
		expect(placeholderColors('Dune')).toEqual(placeholderColors('Dune'));
		const colours = new Set(
			['Dune', 'Emma', 'Circe', 'Kindred', 'Piranesi', 'Hobbit'].map((t) => placeholderColors(t).bg)
		);
		expect(colours.size).toBeGreaterThan(2);
	});
});

describe('readableInk', () => {
	it('picks dark text on light colours and light text on dark ones', () => {
		expect(readableInk('#f5e6a8')).toContain('0.25');
		expect(readableInk('#2040c0')).toContain('0.98');
		expect(readableInk('nonsense')).toContain('0.28');
	});
});
