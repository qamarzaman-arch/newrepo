/**
 * End-to-End Test: Complete Order Flow
 * Tests the entire order lifecycle from creation to completion
 */

import { test, expect } from '@playwright/test';

test.describe('Complete Order Flow E2E', () => {
  let authToken: string;
  let orderId: string;

  // Login before tests
  test.beforeAll(async ({ request }) => {
    const response = await request.post('http://localhost:3001/api/v1/auth/login', {
      data: {
        username: 'cashier',
        password: 'password123',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    authToken = data.data.token;
    expect(authToken).toBeDefined();
  });

  test('should create a new dine-in order', async ({ request }) => {
    const orderData = {
      orderType: 'DINE_IN',
      tableId: null,
      customerId: null,
      customerName: 'Test Customer',
      items: [
        {
          menuItemId: 'test-menu-item-1',
          quantity: 2,
          notes: 'No onions',
        },
        {
          menuItemId: 'test-menu-item-2',
          quantity: 1,
          notes: '',
        },
      ],
      discountPercent: null,
      discountAmount: null,
      tipAmount: 5.00,
      notes: 'Test order from E2E',
    };

    const response = await request.post('http://localhost:3001/api/v1/orders', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: orderData,
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data.order).toBeDefined();
    expect(result.data.order.orderNumber).toMatch(/^ORD-/);
    expect(result.data.order.status).toBe('PENDING');
    expect(result.data.order.items).toHaveLength(2);
    
    orderId = result.data.order.id;
  });

  test('should retrieve the created order', async ({ request }) => {
    const response = await request.get(`http://localhost:3001/api/v1/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data.order.id).toBe(orderId);
    expect(result.data.order.customerName).toBe('Test Customer');
  });

  test('should update order status to PREPARING', async ({ request }) => {
    const response = await request.patch(
      `http://localhost:3001/api/v1/orders/${orderId}/status`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          status: 'PREPARING',
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data.order.status).toBe('PREPARING');
  });

  test('should update order status to READY', async ({ request }) => {
    const response = await request.patch(
      `http://localhost:3001/api/v1/orders/${orderId}/status`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          status: 'READY',
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data.order.status).toBe('READY');
  });

  test('should process payment for the order', async ({ request }) => {
    const paymentData = {
      method: 'CASH',
      amount: 50.00,
      cashReceived: 60.00,
    };

    const response = await request.post(
      `http://localhost:3001/api/v1/orders/${orderId}/payment`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: paymentData,
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data.payment).toBeDefined();
    expect(result.data.payment.method).toBe('CASH');
    expect(result.data.payment.change).toBe(10.00);
  });

  test('should mark order as completed after payment', async ({ request }) => {
    const response = await request.get(`http://localhost:3001/api/v1/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.data.order.status).toBe('COMPLETED');
    expect(result.data.order.payments).toHaveLength(1);
  });

  test('should list orders with pagination', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/v1/orders?page=1&limit=10', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data.orders).toBeDefined();
    expect(result.data.pagination).toBeDefined();
    expect(result.data.pagination.page).toBe(1);
    expect(result.data.pagination.limit).toBe(10);
    expect(result.data.pagination.total).toBeGreaterThanOrEqual(1);
  });

  test('should filter orders by status', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/v1/orders?status=COMPLETED', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data.orders.every((order: any) => order.status === 'COMPLETED')).toBe(true);
  });

  test('should handle rate limiting on order creation', async ({ request }) => {
    const orderData = {
      orderType: 'TAKEAWAY',
      items: [
        {
          menuItemId: 'test-menu-item-1',
          quantity: 1,
        },
      ],
    };

    // Make multiple rapid requests to trigger rate limit
    const promises = [];
    for (let i = 0; i < 25; i++) {
      promises.push(
        request.post('http://localhost:3001/api/v1/orders', {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          data: orderData,
        })
      );
    }

    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status() === 429);
    
    // At least one should be rate limited
    expect(rateLimited).toBe(true);
  });

  test('should validate password complexity on registration', async ({ request }) => {
    // Test weak password
    const weakPasswordResponse = await request.post('http://localhost:3001/api/v1/auth/register', {
      data: {
        username: 'testuser123',
        email: 'test@example.com',
        password: 'weak',
        fullName: 'Test User',
        role: 'STAFF',
      },
    });

    expect(weakPasswordResponse.status()).toBe(400);
    
    // Test strong password
    const strongPasswordResponse = await request.post('http://localhost:3001/api/v1/auth/register', {
      data: {
        username: 'testuser456',
        email: 'test2@example.com',
        password: 'StrongPass123!',
        fullName: 'Test User 2',
        role: 'STAFF',
      },
    });

    // Should succeed or fail for different reason (duplicate user), not password validation
    const result = await strongPasswordResponse.json();
    if (!strongPasswordResponse.ok()) {
      expect(result.error.message).not.toContain('Password must');
    }
  });
});
