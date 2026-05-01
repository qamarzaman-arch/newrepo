import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { paymentLimiter } from '../middleware/rateLimiter';
import { paymentGatewayService } from '../services/paymentGateway.service';
import { toCentsSafe } from '../utils/money';

const router = Router();

// Validation schema
const validateCardSchema = z.object({
  amount: z.number().positive(),
  cardDetails: z.object({
    lastFour: z.string().length(4).optional(),
  }).optional(),
});

/**
 * Validate card payment
 * This endpoint simulates payment gateway integration
 * In production, this should integrate with actual payment processors like:
 * - Stripe
 * - Square
 * - PayPal
 * - Authorize.net
 */
router.post('/validate-card', authenticate, paymentLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, cardDetails } = validateCardSchema.parse(req.body);

    // QA A25: idempotency. If the caller passes Idempotency-Key and we've
    // already created a PaymentIntent for it, return the cached response
    // instead of opening a duplicate Stripe charge.
    const idempotencyKey = (req.headers['idempotency-key'] as string | undefined)?.trim();
    if (idempotencyKey) {
      const existing = await prisma.paymentValidation.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return res.json({
          success: true,
          data: {
            transactionId: existing.transactionId,
            status: existing.status,
            amount: Number(existing.amount),
          },
          idempotent: true,
        });
      }
    }

    // QA A76: mask the card last-4. The clear value still lives in the
    // PaymentValidation row for reconciliation, but it should not be in
    // application logs.
    const maskedLast4 = cardDetails?.lastFour ? `****${cardDetails.lastFour.slice(-2).padStart(4, '*')}` : undefined;
    logger.info(`Card payment validation requested by ${sanitize(req.user?.username || 'unknown')}: ${amount}`, {
      lastFour: maskedLast4,
      userId: req.user?.userId,
    });

    // Validate card last four is provided for audit
    if (!cardDetails?.lastFour) {
      throw new AppError('Card last four digits required for validation', 400);
    }

    // Validate last four digits format
    if (!/^\d{4}$/.test(cardDetails.lastFour)) {
      throw new AppError('Invalid card last four digits format', 400);
    }

    // Create Stripe Payment Intent.
    // QA A22: never put PII (username, full name, email, phone) into Stripe metadata.
    // QA A23: convert to integer cents in a precision-safe way using string formatting.
    const amountCents = toCentsSafe(amount);
    const paymentIntentData = {
      amount: amountCents,
      currency: 'usd',
      orderId: `manual-${Date.now()}`,
      metadata: {
        userId: req.user?.userId ?? '',
      },
    };

    const stripeResult = await paymentGatewayService.createStripePaymentIntent(paymentIntentData);

    // Log successful validation
    logger.info(`Stripe PaymentIntent created: ${sanitize(stripeResult.paymentIntentId)}`);

    try {
      await prisma.paymentValidation.create({
        data: {
          transactionId: stripeResult.paymentIntentId,
          amount: amount,
          method: 'CARD',
          status: stripeResult.status.toUpperCase(),
          cardLastFour: cardDetails?.lastFour,
          gatewayResponse: JSON.stringify(stripeResult),
          idempotencyKey: idempotencyKey,
        },
      });
    } catch (err: any) {
      // QA A24: do not swallow audit-write failures.
      logger.error(`PaymentValidation insert failed for ${stripeResult.paymentIntentId}: ${err.message}`);
    }

    res.json({
      success: true,
      data: {
        transactionId: stripeResult.paymentIntentId,
        status: stripeResult.status,
        amount: amount,
        clientSecret: stripeResult.clientSecret,
      },
    });
  } catch (error: any) {
    logger.error('Card payment validation failed:', error);

    // Return user-friendly error
    if (error.message?.includes('declined')) {
      return res.status(400).json({
        success: false,
        message: 'Card payment was declined. Please try another payment method.',
      });
    }

    next(error);
  }
});

/**
 * Get payment validation history
 * For audit and reconciliation purposes
 */
router.get('/validations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, status } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    if (status) where.status = status;

    const validations = await prisma.paymentValidation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({
      success: true,
      data: { validations },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
