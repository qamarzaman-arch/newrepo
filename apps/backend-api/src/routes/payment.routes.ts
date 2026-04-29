import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { paymentLimiter } from '../middleware/rateLimiter';
import { paymentGatewayService } from '../services/paymentGateway.service';

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

    // Log payment attempt with user context
    logger.info(`Card payment validation requested by ${sanitize(req.user?.username || 'unknown')}: ${amount}`, {
      lastFour: cardDetails?.lastFour,
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

    // Create Stripe Payment Intent
    const paymentIntentData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      orderId: `manual-${Date.now()}`,
      metadata: {
        userId: req.user?.userId,
        username: req.user?.username,
        cardLastFour: cardDetails?.lastFour,
      },
    };

    const stripeResult = await paymentGatewayService.createStripePaymentIntent(paymentIntentData);

    // Log successful validation
    logger.info(`Stripe PaymentIntent created: ${sanitize(stripeResult.paymentIntentId)}`);

    await prisma.paymentValidation.create({
      data: {
        transactionId: stripeResult.paymentIntentId,
        amount: amount,
        method: 'CARD',
        status: stripeResult.status.toUpperCase(),
        cardLastFour: cardDetails?.lastFour,
        gatewayResponse: JSON.stringify(stripeResult),
      },
    }).catch((err) => {
      logger.error('Could not store payment validation record:', err.message);
    });

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
