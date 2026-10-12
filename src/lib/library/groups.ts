import type { GroupField } from './query.js';
import type { BookListItem, GroupCount } from '../types.js';

export type Segment = { label: string | null; count: number; items: BookListItem[] };

const empty: Record<GroupField, string> = {
	none: '',
	author: 'No author',
	series: 'Standalone',
	publisher: 'No publisher',
	location: 'No location',
	reading: 'Unknown',
	addedMonth: 'Unknown date'
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Human-readable group heading. */
export function groupLabel(field: GroupField, label: string | null): string {
	if (label === null || label === '') return empty[field];
	if (field === 'addedMonth') {
		const [year, month] = label.split('-').map(Number);
		return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		});
	}
	if (field === 'reading') return capitalise(label);
	return label;
}

/** Split an ordered list into consecutive runs of the same group, with total counts. */
export function toSegments(items: BookListItem[], counts: GroupCount[] | undefined): Segment[] {
	const totals = new Map(counts?.map((g) => [g.label, g.count]));
	const segments: Segment[] = [];
	for (const item of items) {
		const last = segments.at(-1);
		if (last && last.label === item.group) last.items.push(item);
		else segments.push({ label: item.group, count: totals.get(item.group) ?? 0, items: [item] });
	}
	return segments;
}
