import { describe, expect, it } from 'vitest';
import { buildMatch } from './search';

describe('buildMatch', () => {
	it('builds AND-ed prefix terms', () => {
		expect(buildMatch('dune frank')).toBe('"dune"* "frank"*');
	});

	it('drops FTS syntax and punctuation', () => {
		expect(buildMatch('"dune" OR (x:y) -z')).toBe('"dune"* "OR"* "x"* "y"* "z"*');
		expect(buildMatch(' !!! ')).toBeNull();
	});

	it('keeps accented and non-latin letters', () => {
		expect(buildMatch('Émile 東京')).toBe('"Émile"* "東京"*');
	});

	it('scopes field searches to their column', () => {
		expect(buildMatch('', { qa: 'frank herb' })).toBe('authors : ("frank"* "herb"*)');
		expect(buildMatch('dune', { qt: 'mess', qi: '' })).toBe('"dune"* title : ("mess"*)');
	});
});
