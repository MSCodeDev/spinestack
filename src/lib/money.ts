const digits = (currency: string) =>
	new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
		.maximumFractionDigits ?? 2;

/** "12.50" -> 1250 (minor units). Null for empty or invalid input. */
export function toMinor(value: string, currency: string): number | null {
	const n = Number(value.replace(',', '.'));
	if (!value.trim() || !Number.isFinite(n) || n < 0) return null;
	return Math.round(n * 10 ** digits(currency));
}

export const fromMinor = (minor: number, currency: string) =>
	(minor / 10 ** digits(currency)).toFixed(digits(currency));

export const formatMoney = (minor: number, currency: string) =>
	new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
		minor / 10 ** digits(currency)
	);
