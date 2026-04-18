# Payment & Security API Documentation

## Overview
This document describes the new security and payment validation endpoints added to the POS system.

## Endpoints

### 1. Validate Manager PIN

**Endpoint:** `POST /api/v1/auth/validate-pin`

**Description:** Validates a manager PIN for sensitive operations like applying large discounts, processing refunds, or voiding items.

**Request Body:**
```json
{
  "pin": "123456",
  "operation": "discount-25%"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "valid": true
  }
}
```

**Response (Invalid PIN):**
```json
{
  "success": true,
  "data": {
    "valid": false
  }
}
```

**Security Notes:**
- PIN is stored as bcrypt hash in database
- Failed attempts are logged for audit
- Returns false instead of error to prevent information leakage
- Operation parameter is logged for audit trail

---

### 2. Validate Card Payment

**Endpoint:** `POST /api/v1/payments/validate-card`

**Description:** Validates a card payment through payment gateway integration. Currently simulates gateway response but designed for easy integration with Stripe, Square, PayPal, etc.

**Request Body:**
```json
{
  "amount": 150.50,
  "cardDetails": {
    "lastFour": "1234"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-1234567890-ABC123",
    "status": "approved",
    "amount": 150.50
  }
}
```

**Response (Declined):**
```json
{
  "success": false,
  "message": "Card payment was declined. Please try another payment method."
}
```

**Integration Points:**
- **Stripe:** Replace `simulatePaymentGateway()` with `stripe.paymentIntents.create()`
- **Square:** Use `squareClient.paymentsApi.createPayment()`
- **PayPal:** Use `paypal.payment.create()`
- **Authorize.net:** Use their payment gateway API

---

### 3. Get Payment Validations (Audit)

**Endpoint:** `GET /api/v1/payments/validations`

**Description:** Retrieves payment validation history for audit and reconciliation.

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `status` (optional): APPROVED, DECLINED, ERROR

**Response:**
```json
{
  "success": true,
  "data": {
    "validations": [
      {
        "id": "uuid",
        "transactionId": "TXN-1234567890-ABC123",
        "amount": 150.50,
        "method": "CARD",
        "status": "APPROVED",
        "cardLastFour": "1234",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

## Setup Instructions

### 1. Initialize Manager PIN

Run the setup script to create the manager PIN:

```bash
cd apps/backend-api
node setup-manager-pin.js 123456
```

This will:
- Hash the PIN using bcrypt
- Store it in the `Setting` table with key `manager_pin`
- Make it available for validation

### 2. Run Database Migration (Optional)

If you want to track payment validations:

```bash
cd apps/backend-api
npx prisma migrate dev --name add_payment_validation
```

Or manually run the SQL:
```bash
psql -U your_user -d your_database -f prisma/migrations/add_payment_validation.sql
```

### 3. Configure Payment Gateway (Production)

Edit `apps/backend-api/src/routes/payment.routes.ts`:

**For Stripe:**
```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const paymentResult = await stripe.paymentIntents.create({
  amount: Math.round(amount * 100), // Convert to cents
  currency: 'usd',
  payment_method_types: ['card'],
});
```

**For Square:**
```typescript
import { Client, Environment } from 'square';
const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Production,
});

const paymentResult = await client.paymentsApi.createPayment({
  sourceId: cardNonce,
  amountMoney: {
    amount: Math.round(amount * 100),
    currency: 'USD',
  },
  idempotencyKey: crypto.randomUUID(),
});
```

---

## Security Features

### PIN Validation
- ✅ Stored as bcrypt hash (12 rounds)
- ✅ Server-side validation only
- ✅ Audit logging of all attempts
- ✅ No information leakage on failure
- ✅ Operation tracking for compliance

### Card Payment
- ✅ Backend validation required
- ✅ Transaction ID tracking
- ✅ Audit trail in database
- ✅ Gateway integration ready
- ✅ Graceful error handling

---

## Testing

### Test PIN Validation
```bash
curl -X POST http://localhost:3000/api/v1/auth/validate-pin \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "123456",
    "operation": "discount-25%"
  }'
```

### Test Card Payment
```bash
curl -X POST http://localhost:3000/api/v1/payments/validate-card \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150.50,
    "cardDetails": {
      "lastFour": "1234"
    }
  }'
```

---

## Frontend Integration

The frontend already calls these endpoints via `validationService.ts`:

```typescript
// Validate PIN
const isValid = await validationService.validateManagerPin(
  pin,
  'discount-25%'
);

// Validate Card
const result = await validationService.validateCardPayment(
  total,
  { lastFour: '1234' }
);
```

---

## Environment Variables

Add to `.env`:

```env
# Manager PIN (will be hashed and stored in DB)
MANAGER_PIN_DEFAULT=123456

# Payment Gateway (choose one)
STRIPE_SECRET_KEY=sk_test_...
SQUARE_ACCESS_TOKEN=...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

---

## Audit & Compliance

All sensitive operations are logged:
- PIN validation attempts (success/failure)
- Card payment validations
- Transaction IDs
- Timestamps
- Operation types

Logs are stored in:
- Application logs: `apps/backend-api/logs/`
- Database: `PaymentValidation` table
- System logs: Via Winston logger

---

## Production Checklist

- [ ] Set strong manager PIN (6 digits minimum)
- [ ] Configure real payment gateway
- [ ] Enable SSL/TLS for API
- [ ] Set up rate limiting on validation endpoints
- [ ] Configure log rotation
- [ ] Set up monitoring alerts
- [ ] Test payment gateway integration
- [ ] Review PCI compliance requirements
- [ ] Set up backup payment method
- [ ] Document PIN change procedure

---

## Support

For issues or questions:
1. Check logs: `apps/backend-api/logs/`
2. Review Prisma schema
3. Test endpoints with curl/Postman
4. Check payment gateway documentation
