const DAY_MS = 86_400_000;

/** Whole days since 1970-01-01 for a YYYY-MM-DD date. Loose month ends like "2024-06-31" are clamped to a real day. */
export function isoToDay(iso: string): number {
	const [y, m, d] = iso.split('-').map(Number);
	const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
	return Date.UTC(y, m - 1, Math.min(d, lastDay)) / DAY_MS;
}

export const dayToIso = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
