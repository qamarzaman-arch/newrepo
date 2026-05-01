import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

const router = Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {}) : null;

/**
 * Stripe webhook receiver.
 *
 * IMPORTANT: this route MUST receive the raw request body (not JSON-parsed)
 * because Stripe signs the exact byte payload. The raw-body middleware is
 * registered in server.ts at the same mount path before express.json().
 *
 * QA refs: A21 (route did not exist), A52 (raw body unused), A25 (idempotent),
 * A24 (audit logging on webhook handling).
 */
router.post('/stripe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!stripe) {
      throw new AppError('Stripe not configured', 500);
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new AppError('Stripe webhook secret not configured', 500);
    }

    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      throw new AppError('Missing Stripe signature header', 400);
    }

    // req.body is a Buffer here because of express.raw() in server.ts
    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody)) {
      logger.error('Stripe webhook: request body is not a Buffer; raw-body middleware misconfigured');
      throw new AppError('Webhook payload must be raw bytes', 500);
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      logger.warn(`Stripe webhook signature verification failed: ${err.message}`);
      // Stripe expects 400 for bad signatures so it can retry/alert.
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Idempotency: persist the event id so retries are no-ops.
    try {
      await prisma.stripeWebhookEvent.create({
        data: {
          eventId: event.id,
          eventType: event.type,
          payload: JSON.stringify(event).slice(0, 100_000),
        },
      });
    } catch (err: any) {
      // Unique constraint -> we've already processed this event; ack and exit.
      if (err?.code === 'P2002') {
        logger.info(`Stripe webhook duplicate ignored: ${sanitize(event.id)} (${event.type})`);
        return res.json({ received: true, duplicate: true });
      }
      throw err;
    }

    logger.info(`Stripe webhook accepted: ${sanitize(event.id)} (${event.type})`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await prisma.paymentValidation.updateMany({
          where: { transactionId: pi.id },
          data: { status: 'SUCCEEDED', gatewayResponse: JSON.stringify({ eventId: event.id, status: pi.status }) },
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const reason = pi.last_payment_error?.message ?? 'unknown';
        await prisma.paymentValidation.updateMany({
          where: { transactionId: pi.id },
          data: { status: 'FAILED', gatewayResponse: JSON.stringify({ eventId: event.id, reason }) },
        });
        logger.warn(`Stripe PaymentIntent failed: ${sanitize(pi.id)} reason=${sanitize(reason)}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const refundId = charge.refunds?.data?.[0]?.id ?? null;
        await prisma.payment.updateMany({
          where: { stripeChargeId: charge.id },
          data: {
            status: 'REFUNDED',
            stripeRefundId: refundId ?? undefined,
          },
        });
        break;
      }

      case 'charge.dispute.created':
      case 'charge.dispute.closed':
      case 'charge.dispute.funds_withdrawn':
        // Capture for ops review; do not auto-mutate orders.
        logger.warn(`Stripe dispute event: ${event.type} (${sanitize(event.id)})`);
        break;

      default:
        logger.info(`Stripe webhook unhandled type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

export default router;
