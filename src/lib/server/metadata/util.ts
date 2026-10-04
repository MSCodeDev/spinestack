import { toIsbn13 } from '../../isbn.js';

type Json = Record<string, unknown>;

export const asObject = (value: unknown): Json =>
	value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const asString = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() ? value.trim() : null;

export const asInt = (value: unknown): number | null =>
	typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;

export const strings = (value: unknown): string[] =>
	asArray(value)
		.map(asString)
		.filter((v): v is string => v !== null);

const MAX_TEXT = 4000;

/** Plain text, without provider boilerplate, capped in length. */
export function cleanText(value: string | null): string | null {
	if (!value) return null;
	const text = value
		.split(/\r?\n-{5,}/)[0]
		.replace(/\r\n/g, '\n')
		.trim();
	return text ? text.slice(0, MAX_TEXT) : null;
}

const LANGUAGES: Record<string, string> = {
	eng: 'en',
	fre: 'fr',
	fra: 'fr',
	ger: 'de',
	deu: 'de',
	spa: 'es',
	ita: 'it',
	por: 'pt',
	dut: 'nl',
	nld: 'nl',
	rus: 'ru',
	jpn: 'ja',
	chi: 'zh',
	zho: 'zh',
	kor: 'ko',
	pol: 'pl',
	swe: 'sv',
	nor: 'no',
	dan: 'da',
	fin: 'fi',
	cze: 'cs',
	ces: 'cs',
	hun: 'hu',
	tur: 'tr',
	ara: 'ar',
	heb: 'he',
	gre: 'el',
	ell: 'el',
	lat: 'la'
};

/** ISO 639-2 (eng) or 639-1 (en) to a two-letter code; null when unknown. */
export function languageCode(value: string | null): string | null {
	const code = value?.toLowerCase().split(/[-_]/)[0] ?? '';
	if (code.length === 2) return code;
	return LANGUAGES[code] ?? null;
}

/**
 * Pick the most useful ISBN-13 from many editions: valid ones only, preferring the
 * English-speaking registration groups (978-0 / 978-1).
 */
export function pickIsbn(values: string[]): string | null {
	const valid = values.map(toIsbn13).filter((v): v is string => v !== null);
	return valid.find((v) => /^978[01]/.test(v)) ?? valid[0] ?? null;
}

export const yearOf = (value: string | null): number | null => {
	const match = value?.match(/\b(1[5-9]\d\d|20\d\d)\b/);
	return match ? Number(match[1]) : null;
};
