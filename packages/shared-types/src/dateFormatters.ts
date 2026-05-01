/**
 * Date Formatting Utilities
 * Shared between backend and frontend
 */

export type DateFormat = 'short' | 'long' | 'time' | 'datetime' | 'relative';

const DEFAULT_LOCALE = 'en-US';

/**
 * Format a date to locale string with consistent options
 */
export const formatDate = (
  date: Date | string | number | undefined | null,
  format: DateFormat = 'short',
  locale: string = DEFAULT_LOCALE
): string => {
  if (!date) return 'N/A';

  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid Date';

  switch (format) {
    case 'short':
      return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

    case 'long':
      return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });

    case 'time':
      return d.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

    case 'datetime':
      return d.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    case 'relative':
      return getRelativeTime(d, locale);

    default:
      return d.toLocaleDateString(locale);
  }
};

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export const getRelativeTime = (
  date: Date | string | number,
  locale: string = DEFAULT_LOCALE
): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSecs) < 60) {
    return rtf.format(diffSecs, 'second');
  } else if (Math.abs(diffMins) < 60) {
    return rtf.format(diffMins, 'minute');
  } else if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  } else {
    return rtf.format(diffDays, 'day');
  }
};

/**
 * Format date for order display (e.g., "Jan 15, 2024 at 2:30 PM")
 */
export const formatOrderDate = (
  date: Date | string | number | undefined | null,
  locale: string = DEFAULT_LOCALE
): string => {
  if (!date) return 'N/A';

  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid Date';

  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date for receipts (compact format)
 */
export const formatReceiptDate = (
  date: Date | string | number | undefined | null,
  locale: string = DEFAULT_LOCALE
): string => {
  if (!date) return 'N/A';

  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid Date';

  return d.toLocaleString(locale, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

/**
 * Get start of day in the user's local timezone (legacy behaviour).
 *
 * QA D53: setHours uses local time, which means on a DST transition day
 * the resulting Date can land an hour earlier or later than expected.
 * For storage / query bounds, prefer `startOfDayUTC` below.
 */
export const startOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/** UTC variants — DST-safe; use these for DB query boundaries. */
export const startOfDayUTC = (date: Date = new Date()): Date => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

export const endOfDayUTC = (date: Date = new Date()): Date => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * QA D47: branch-aware formatters. A multi-branch deployment displays each
 * branch's data in that branch's timezone, not the server's. These wrappers
 * accept an IANA tz string (typically branch.timezone) and fall back to the
 * untouched local-time formatters when no zone is supplied.
 */
export const formatDateInZone = (
  date: Date | string | number | undefined | null,
  timeZone?: string | null,
  locale: string = DEFAULT_LOCALE,
): string => {
  if (!date) return 'N/A';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  if (!timeZone) return formatOrderDate(d, locale);
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone,
    }).format(d);
  } catch {
    return formatOrderDate(d, locale);
  }
};

export const formatTimeInZone = (
  date: Date | string | number | undefined | null,
  timeZone?: string | null,
  locale: string = DEFAULT_LOCALE,
): string => {
  if (!date) return 'N/A';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: timeZone || undefined,
    }).format(d);
  } catch {
    return d.toLocaleTimeString(locale);
  }
};

/**
 * Format duration in minutes to readable string
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
};
