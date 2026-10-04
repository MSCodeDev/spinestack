import { describe, expect, it } from 'vitest';
import { formatMoney, fromMinor, toMinor } from './money';

describe('money', () => {
	it('converts to and from minor units', () => {
		expect(toMinor('12.50', 'USD')).toBe(1250);
		expect(toMinor('12,5', 'EUR')).toBe(1250);
		expect(toMinor('500', 'JPY')).toBe(500);
		expect(fromMinor(1250, 'USD')).toBe('12.50');
		expect(fromMinor(500, 'JPY')).toBe('500');
	});

	it('rejects empty and invalid input', () => {
		expect(toMinor('', 'USD')).toBeNull();
		expect(toMinor('abc', 'USD')).toBeNull();
		expect(toMinor('-3', 'USD')).toBeNull();
	});

	it('formats', () => {
		expect(formatMoney(1250, 'USD')).toContain('12.50');
	});
});
