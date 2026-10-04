import { describe, expect, it } from 'vitest';
import { blobPath, hashString, seeded } from './blob';

describe('seeded', () => {
	it('is deterministic and stays in [0, 1)', () => {
		const a = seeded(42);
		const b = seeded(42);
		const first = [a(), a(), a()];
		expect(first).toEqual([b(), b(), b()]);
		expect(first.every((n) => n >= 0 && n < 1)).toBe(true);
		expect(seeded(43)()).not.toBe(first[0]);
	});
});

describe('blobPath', () => {
	it('draws a closed curve and is stable for a seed', () => {
		const d = blobPath(7);
		expect(d).toMatch(/^M[\d.]+,[\d.]+(C[\d., -]+)+Z$/);
		expect(d.match(/C/g)).toHaveLength(8);
		expect(blobPath(7)).toBe(d);
	});

	it('differs between seeds and stays inside the box', () => {
		expect(blobPath(1)).not.toBe(blobPath(2));
		const coords = blobPath(99, { size: 100 })
			.match(/-?\d+\.\d/g)!
			.map(Number);
		expect(Math.min(...coords)).toBeGreaterThan(-10);
		expect(Math.max(...coords)).toBeLessThan(110);
	});
});

describe('hashString', () => {
	it('is stable per string', () => {
		expect(hashString('Dune')).toBe(hashString('Dune'));
		expect(hashString('Dune')).not.toBe(hashString('Emma'));
	});
});
