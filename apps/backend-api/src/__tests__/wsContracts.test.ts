import {
  WsOrderSummarySchema, WsOrderStatusChangedSchema,
  WsRiderLocationSchema, WsCashDrawerClosedSchema,
} from '@restaurant-pos/shared-types';

describe('WebSocket payload contracts (D23-D26)', () => {
  it('accepts a minimal order summary', () => {
    const r = WsOrderSummarySchema.safeParse({ id: 'order-1' });
    expect(r.success).toBe(true);
  });

  it('rejects an order summary missing id', () => {
    const r = WsOrderSummarySchema.safeParse({ orderNumber: 'ORD-1' });
    expect(r.success).toBe(false);
  });

  it('order:status-changed requires both orderId and status', () => {
    expect(WsOrderStatusChangedSchema.safeParse({ orderId: 'o1', status: 'PENDING' }).success).toBe(true);
    expect(WsOrderStatusChangedSchema.safeParse({ orderId: 'o1' }).success).toBe(false);
    expect(WsOrderStatusChangedSchema.safeParse({ status: 'PENDING' }).success).toBe(false);
  });

  it('rider location enforces lat/lng bounds', () => {
    const valid = {
      riderId: 'r1',
      location: { lat: 33.6, lng: 73.0 },
      timestamp: new Date().toISOString(),
    };
    expect(WsRiderLocationSchema.safeParse(valid).success).toBe(true);

    const badLat = { ...valid, location: { lat: 100, lng: 73 } };
    expect(WsRiderLocationSchema.safeParse(badLat).success).toBe(false);

    const badLng = { ...valid, location: { lat: 33, lng: 200 } };
    expect(WsRiderLocationSchema.safeParse(badLng).success).toBe(false);
  });

  it('cash-drawer:closed validates the difference field', () => {
    const r = WsCashDrawerClosedSchema.safeParse({
      openingAmount: 100,
      closingAmount: 250,
      difference: 150,
      timestamp: new Date().toISOString(),
    });
    expect(r.success).toBe(true);
  });
});
