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
 * Get start of day
 */
export const startOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day
 */
export const endOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
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
