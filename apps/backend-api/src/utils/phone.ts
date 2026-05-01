/**
 * QA A19, A74, B27, C36: normalize phone numbers so the same customer can't
 * end up split across multiple records by formatting variation
 * ("+1 555-1234" vs "5551234" vs "1.555.1234").
 *
 * This is intentionally conservative — strip everything that isn't a digit
 * or a leading '+', and reject empty strings. Full E.164 conversion needs
 * libphonenumber-js, which is left to a later phase.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return (hasPlus ? '+' : '') + digits;
}
