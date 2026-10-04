import { sql } from 'drizzle-orm';

/** Currencies without minor units, so a stored price is already in major units. */
const ZERO_DECIMAL = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX', 'XAF', 'XOF'];

/** SQL for a book's paid price in major units (dollars, not cents). Expects the `book` table aliased as `b`. */
export const paidMajor = sql`(b.paid_price / (case when b.currency in (${sql.join(
	ZERO_DECIMAL.map((c) => sql`${c}`),
	sql`, `
)}) then 1.0 else 100.0 end))`;
