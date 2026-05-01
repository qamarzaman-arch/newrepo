import {
  OrderStatusEnum, PaymentStatusEnum, UserRoleEnum,
  InventoryStatusEnum, KotStatusEnum, assertEnum,
} from '../utils/enums';

describe('runtime enum guards (D12-D16)', () => {
  it('accepts canonical OrderStatus values', () => {
    expect(OrderStatusEnum.parse('PENDING')).toBe('PENDING');
    expect(OrderStatusEnum.parse('PARTIALLY_REFUNDED')).toBe('PARTIALLY_REFUNDED');
  });

  it('rejects garbage and case-mismatched OrderStatus', () => {
    expect(() => OrderStatusEnum.parse('Pending')).toThrow();
    expect(() => OrderStatusEnum.parse('done')).toThrow();
    expect(() => OrderStatusEnum.parse(undefined)).toThrow();
  });

  it('rejects unknown PaymentStatus and UserRole', () => {
    expect(() => PaymentStatusEnum.parse('SUCCESS')).toThrow();
    expect(() => UserRoleEnum.parse('SUPERUSER')).toThrow();
  });

  it('InventoryStatusEnum and KotStatusEnum cover all expected values', () => {
    expect(() => InventoryStatusEnum.parse('IN_STOCK')).not.toThrow();
    expect(() => InventoryStatusEnum.parse('LOW_STOCK')).not.toThrow();
    expect(() => InventoryStatusEnum.parse('OUT_OF_STOCK')).not.toThrow();
    expect(() => KotStatusEnum.parse('NEW')).not.toThrow();
    expect(() => KotStatusEnum.parse('IN_PROGRESS')).not.toThrow();
  });

  it('assertEnum surfaces a clear error message', () => {
    try {
      assertEnum(OrderStatusEnum, 'BOGUS', 'order.status');
      fail('expected throw');
    } catch (err: any) {
      expect(err.message).toMatch(/Invalid order\.status: BOGUS/);
      expect(err.message).toMatch(/Allowed:/);
    }
  });
});
