import { Prisma } from '@prisma/client';
import { toDecimal, toCentsSafe, roundMoney, sumMoney, clampMoney, minMoney } from '../utils/money';

describe('money utils', () => {
  describe('toDecimal', () => {
    it('returns 0 for null/undefined', () => {
      expect(toDecimal(null).toString()).toBe('0');
      expect(toDecimal(undefined).toString()).toBe('0');
    });

    it('strips float artefacts via toFixed(4) before Decimal parse', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754 — must end up as exactly 0.3.
      const drift = 0.1 + 0.2;
      expect(toDecimal(drift).toString()).toBe('0.3');
    });

    it('passes Decimal instances through unchanged', () => {
      const d = new Prisma.Decimal('123.45');
      expect(toDecimal(d)).toBe(d);
    });

    it('parses string money exactly', () => {
      expect(toDecimal('99.99').toString()).toBe('99.99');
    });
  });

  describe('toCentsSafe', () => {
    it('rounds half up to integer cents', () => {
      // QA A23: Math.round(amount * 100) misroutes on values like 10.015.
      expect(toCentsSafe(10.015)).toBe(1002);
      expect(toCentsSafe('10.015')).toBe(1002);
      expect(toCentsSafe(0.1 + 0.2)).toBe(30);
    });

    it('handles very large amounts without precision loss', () => {
      expect(toCentsSafe('1234567890.99')).toBe(123456789099);
    });
  });

  describe('roundMoney', () => {
    it('rounds to 2 dp by default', () => {
      expect(roundMoney('1.234').toString()).toBe('1.23');
      expect(roundMoney('1.235').toString()).toBe('1.24');
    });
  });

  describe('sumMoney / clampMoney / minMoney', () => {
    it('sums without float drift', () => {
      expect(sumMoney([0.1, 0.2, 0.3]).toString()).toBe('0.6');
    });

    it('clamps within range', () => {
      expect(clampMoney(5, 10, 20).toString()).toBe('10');
      expect(clampMoney(25, 10, 20).toString()).toBe('20');
      expect(clampMoney(15, 10, 20).toString()).toBe('15');
    });

    it('minMoney returns smaller', () => {
      expect(minMoney(5, 10).toString()).toBe('5');
      expect(minMoney(10, 5).toString()).toBe('5');
    });
  });
});
