import { Prisma } from '@prisma/client';

/**
 * Money helpers — keep all currency math in integer cents or Prisma Decimal.
 *
 * QA refs: A23, A30, A45, D1, D48, D49.
 */

const Decimal = Prisma.Decimal;
type DecimalLike = Prisma.Decimal | number | string;

/** Coerce anything money-shaped into a Prisma.Decimal without float drift. */
export function toDecimal(value: DecimalLike | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  if (value instanceof Decimal) return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return new Decimal(0);
    // Stringify with 4dp, then strip — avoids the binary-float artefacts
    // (e.g. 0.1 + 0.2) before Decimal parses.
    return new Decimal(value.toFixed(4));
  }
  return new Decimal(value);
}

/** Convert a money value to integer cents (rounded HALF_UP). */
export function toCentsSafe(value: DecimalLike): number {
  const d = toDecimal(value);
  // ROUND_HALF_UP is enum 1 in decimal.js; do it explicitly so reading
  // is unambiguous regardless of any global Decimal config.
  const cents = d.mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return cents.toNumber();
}

/** Round a Decimal to the given currency precision (default 2dp, HALF_UP). */
export function roundMoney(value: DecimalLike, dp = 2): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP);
}

/** Sum a list of money-shaped values; returns Decimal. */
export function sumMoney(values: Array<DecimalLike | null | undefined>): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((acc, v) => acc.add(toDecimal(v)), new Decimal(0));
}

/** Clamp a Decimal between [min, max]. */
export function clampMoney(value: DecimalLike, min: DecimalLike, max: DecimalLike): Prisma.Decimal {
  const v = toDecimal(value);
  const lo = toDecimal(min);
  const hi = toDecimal(max);
  if (v.lessThan(lo)) return lo;
  if (v.greaterThan(hi)) return hi;
  return v;
}

/** Equivalent of `Math.min(a, b)` for Decimals. */
export function minMoney(a: DecimalLike, b: DecimalLike): Prisma.Decimal {
  const da = toDecimal(a);
  const db = toDecimal(b);
  return da.lessThan(db) ? da : db;
}
