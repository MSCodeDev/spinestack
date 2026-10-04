const AMOUNT = String.raw`\d+(?:[.,]\d+)?`;
const RANGE_SEP = String.raw`\s*(?:-|–|\.\.|\bto\b)\s*`;

const amount = (s: string | undefined) => (s ? Number(s.replace(',', '.')) : null);

export type PriceRange = { min: number | null; max: number | null };

/**
 * One text field for a price: "12.50" (exactly that), "10-20", "10-" (at least) or "-20" (at most).
 * Null when the text is not understood. Amounts are in major units, like dollars.
 */
export function parsePriceRange(text: string): PriceRange | null {
	const t = text.trim();
	if (!t) return null;

	const single = t.match(new RegExp(`^(${AMOUNT})$`));
	if (single) {
		const n = amount(single[1])!;
		return { min: n, max: n };
	}
	const range = t.match(new RegExp(`^(${AMOUNT})?${RANGE_SEP}(${AMOUNT})?$`));
	if (!range || (!range[1] && !range[2])) return null;
	return { min: amount(range[1]), max: amount(range[2]) };
}

export type DateRange = { from: string | null; to: string | null };

const PARTIAL = String.raw`\d{4}(?:-\d{2}(?:-\d{2})?)?`;
const DATE_SEP = String.raw`\s*(?:–|\.\.|\bto\b)\s*`;

/** First day a partial date can mean: "2024" is 2024-01-01, "2024-03" is 2024-03-01. */
const lower = (p: string) => (p.length === 4 ? `${p}-01-01` : p.length === 7 ? `${p}-01` : p);
/** Last day, loosely: "2024" is 2024-12-31 and "2024-02" is 2024-02-31, which still sorts right as text. */
const upper = (p: string) => (p.length === 4 ? `${p}-12-31` : p.length === 7 ? `${p}-31` : p);

/**
 * One text field for a date: "2024" (that year), "2024-03" (that month), "2024-03-15" (that day),
 * or a range like "2024-01..2024-06", "2024..", "..2023-06". Null when not understood.
 */
export function parseDateRange(text: string): DateRange | null {
	const t = text.trim();
	if (!t) return null;

	const single = t.match(new RegExp(`^(${PARTIAL})$`));
	if (single) return { from: lower(single[1]), to: upper(single[1]) };

	const range = t.match(new RegExp(`^(${PARTIAL})?${DATE_SEP}(${PARTIAL})?$`));
	if (!range || (!range[1] && !range[2])) return null;
	return { from: range[1] ? lower(range[1]) : null, to: range[2] ? upper(range[2]) : null };
}
