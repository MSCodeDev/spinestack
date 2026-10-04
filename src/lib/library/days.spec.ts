import { describe, expect, it } from 'vitest';
import { dayToIso, isoToDay } from './days';

describe('days', () => {
	it('round-trips dates', () => {
		expect(isoToDay('1970-01-01')).toBe(0);
		expect(isoToDay('1970-01-02')).toBe(1);
		for (const iso of ['2024-02-29', '2023-12-31', '2026-10-04']) {
			expect(dayToIso(isoToDay(iso))).toBe(iso);
		}
	});

	it('clamps loose month ends to a real day', () => {
		expect(dayToIso(isoToDay('2024-06-31'))).toBe('2024-06-30');
		expect(dayToIso(isoToDay('2023-02-31'))).toBe('2023-02-28');
		expect(dayToIso(isoToDay('2024-02-31'))).toBe('2024-02-29');
	});
});
