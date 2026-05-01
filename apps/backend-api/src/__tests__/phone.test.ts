import { normalizePhone } from '../utils/phone';

describe('normalizePhone (A19, A74, B27, C36)', () => {
  it('returns null on null/undefined/empty', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
  });

  it('strips formatting characters but preserves leading +', () => {
    expect(normalizePhone('+1 (555) 123-4567')).toBe('+15551234567');
    expect(normalizePhone('555.123.4567')).toBe('5551234567');
    expect(normalizePhone('  +44 20 7946 0958 ')).toBe('+442079460958');
  });

  it('rejects too short and too long inputs', () => {
    expect(normalizePhone('12345')).toBeNull(); // 5 digits
    expect(normalizePhone('1'.repeat(16))).toBeNull(); // 16 digits
  });

  it('does not invent a plus from a leading digit', () => {
    expect(normalizePhone('15551234567')).toBe('15551234567');
    expect(normalizePhone('15551234567')).not.toBe('+15551234567');
  });

  it('treats different formats of the same number as equivalent', () => {
    const a = normalizePhone('+1 (555) 123-4567');
    const b = normalizePhone('+1.555.123.4567');
    const c = normalizePhone('+1-555-123-4567');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
