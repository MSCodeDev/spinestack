/** Strip separators and uppercase a trailing X. */
export const cleanIsbn = (value: string) => value.replace(/[\s-]/g, '').toUpperCase();

function isValid10(s: string) {
	if (!/^\d{9}[\dX]$/.test(s)) return false;
	let sum = 0;
	for (let i = 0; i < 10; i++) sum += (s[i] === 'X' ? 10 : Number(s[i])) * (10 - i);
	return sum % 11 === 0;
}

function check13(first12: string) {
	let sum = 0;
	for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 ? 3 : 1);
	return (10 - (sum % 10)) % 10;
}

function isValid13(s: string) {
	return /^\d{13}$/.test(s) && check13(s.slice(0, 12)) === Number(s[12]);
}

export const isValidIsbn = (value: string) => {
	const s = cleanIsbn(value);
	return isValid10(s) || isValid13(s);
};

/** Normalise to ISBN-13, or null when the input is not a valid ISBN. */
export function toIsbn13(value: string): string | null {
	const s = cleanIsbn(value);
	if (isValid13(s)) return s;
	if (!isValid10(s)) return null;
	const first12 = '978' + s.slice(0, 9);
	return first12 + check13(first12);
}
