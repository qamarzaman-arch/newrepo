import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

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
router.post('/validate-card', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    // TODO: Integrate with actual payment gateway
    // Example integration points:
    // 1. Stripe: stripe.paymentIntents.create()
    // 2. Square: squareClient.paymentsApi.createPayment()
    // 3. PayPal: paypal.payment.create()

    // Improved simulation with deterministic transaction ID
    const simulatePaymentGateway = async () => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate deterministic transaction ID based on timestamp and user
      const timestamp = Date.now();
      const transactionId = `TXN-${timestamp}-${req.user?.userId?.slice(-4).toUpperCase()}`;

      return {
        transactionId,
        status: 'approved',
        amount,
        timestamp: new Date().toISOString(),
        cardLastFour: cardDetails?.lastFour,
      };
    };

    const paymentResult = await simulatePaymentGateway();

    // Log successful validation
    logger.info(`Card payment validated successfully: ${sanitize(paymentResult.transactionId)}`);

    // Note: PaymentValidation table is optional for audit trail
    // If you want to track validations, add the table to your Prisma schema
    // and uncomment the code below:
    /*
    await prisma.paymentValidation.create({
      data: {
        transactionId: paymentResult.transactionId,
        amount,
        method: 'CARD',
        status: 'APPROVED',
        cardLastFour: cardDetails?.lastFour,
        gatewayResponse: JSON.stringify(paymentResult),
      },
    }).catch((err) => {
      logger.warn('Could not store payment validation record:', err.message);
    });
    */

    res.json({
      success: true,
      data: {
        transactionId: paymentResult.transactionId,
        status: paymentResult.status,
        amount: paymentResult.amount,
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
 * Note: Requires PaymentValidation table in Prisma schema
 */
router.get('/validations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // This endpoint requires the PaymentValidation table
    // If not using audit trail, you can remove this endpoint
    res.status(501).json({
      success: false,
      message: 'Payment validation history requires PaymentValidation table. See migration file.',
    });

    /* Uncomment when PaymentValidation table is added to schema:
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
    */
  } catch (error) {
    next(error);
  }
});

export default router;
