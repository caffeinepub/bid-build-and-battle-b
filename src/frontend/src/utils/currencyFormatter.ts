/**
 * Currency formatting utilities for B³ Auction App.
 * Amounts are stored as bigint where 1 unit = 1 rupee (smallest unit).
 * 1 Lakh = 100,000 rupees
 * 1 Crore = 10,000,000 rupees
 */

const LAKH = 100_000n;
const CRORE = 10_000_000n;

/** Format bigint amount to Crores display e.g. "₹8.5 Cr" */
export function formatCrores(amount: bigint): string {
  const crores = Number(amount) / Number(CRORE);
  if (crores % 1 === 0) {
    return `₹${crores.toFixed(0)} Cr`;
  }
  return `₹${crores.toFixed(1)} Cr`;
}

/** Format bigint amount to Lakhs display e.g. "₹85 L" */
export function formatLakhs(amount: bigint): string {
  const lakhs = Number(amount) / Number(LAKH);
  if (lakhs % 1 === 0) {
    return `₹${lakhs.toFixed(0)} L`;
  }
  return `₹${lakhs.toFixed(1)} L`;
}

/** Smart format: use Crores if >= 1 Cr, else Lakhs */
export function formatCurrency(amount: bigint): string {
  if (amount >= CRORE) {
    return formatCrores(amount);
  }
  return formatLakhs(amount);
}

/** Same as formatCurrency — alias for bid display */
export function formatBid(amount: bigint): string {
  return formatCurrency(amount);
}

/** Format with full rupee sign and no abbreviation (for detailed views) */
export function formatRupees(amount: bigint): string {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}
