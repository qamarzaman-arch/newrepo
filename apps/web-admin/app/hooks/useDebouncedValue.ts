import { useEffect, useState } from 'react';

/**
 * Debounce a rapidly-changing value (typically a search input).
 *
 * QA refs: C59 (no debounce on admin search inputs anywhere), B26 (customer
 * search firing per keystroke). Pages should call this with the live input
 * value and use the returned debounced value as the actual fetch trigger.
 *
 * Usage:
 *   const [q, setQ] = useState('');
 *   const debouncedQ = useDebouncedValue(q, 300);
 *   useEffect(() => { fetch(...debouncedQ); }, [debouncedQ]);
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
