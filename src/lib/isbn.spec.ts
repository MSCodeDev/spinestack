import { describe, expect, it } from 'vitest';
import { cleanIsbn, isValidIsbn, toIsbn13 } from './isbn';

describe('isbn', () => {
	it('cleans separators', () => {
		expect(cleanIsbn('978-0-306-40615-7')).toBe('9780306406157');
		expect(cleanIsbn('0 8044 2957 x')).toBe('080442957X');
	});

	it('validates ISBN-10 and ISBN-13 checksums', () => {
		expect(isValidIsbn('0-306-40615-2')).toBe(true);
		expect(isValidIsbn('080442957X')).toBe(true);
		expect(isValidIsbn('9780306406157')).toBe(true);
		expect(isValidIsbn('9780306406158')).toBe(false);
		expect(isValidIsbn('abc')).toBe(false);
	});

	it('converts ISBN-10 to ISBN-13', () => {
		expect(toIsbn13('0306406152')).toBe('9780306406157');
		expect(toIsbn13('080442957X')).toBe('9780804429573');
		expect(toIsbn13('9780306406157')).toBe('9780306406157');
		expect(toIsbn13('1234567890')).toBeNull();
	});
});
