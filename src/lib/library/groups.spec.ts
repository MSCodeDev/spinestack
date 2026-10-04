import { describe, expect, it } from 'vitest';
import { groupLabel, toSegments } from './groups';
import type { BookListItem } from '../types';

const item = (id: string, group: string | null) => ({ id, group }) as BookListItem;

describe('groups', () => {
	it('splits consecutive items into segments with totals', () => {
		const segments = toSegments(
			[item('1', 'A'), item('2', 'A'), item('3', null)],
			[
				{ label: 'A', count: 5 },
				{ label: null, count: 1 }
			]
		);
		expect(segments.map((s) => [s.label, s.count, s.items.length])).toEqual([
			['A', 5, 2],
			[null, 1, 1]
		]);
	});

	it('labels empty and special groups', () => {
		expect(groupLabel('series', null)).toBe('Standalone');
		expect(groupLabel('reading', 'unread')).toBe('Unread');
		expect(groupLabel('addedMonth', '2026-10')).toMatch(/2026/);
		expect(groupLabel('author', 'Frank Herbert')).toBe('Frank Herbert');
	});
});
