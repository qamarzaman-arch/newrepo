import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { paymentGatewayService } from '../services/paymentGateway.service';
import { logger, sanitize } from '../utils/logger';

const router = Router();

// Validation schemas
const createPaymentIntentSchema = z.object({
  amount: z.number().min(1), // in cents
  currency: z.string().default('USD'),
  orderId: z.string(),
  customerEmail: z.string().email().optional(),
  provider: z.enum(['stripe', 'square']).default('stripe'),
});

const confirmPaymentSchema = z.object({
  paymentIntentId: z.string(),
  provider: z.enum(['stripe', 'square']).default('stripe'),
});

const refundSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number().min(1).optional(), // partial refund amount in cents
  reason: z.string().optional(),
  provider: z.enum(['stripe', 'square']).default('stripe'),
});

// Create payment intent
router.post('/create-intent', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createPaymentIntentSchema.parse(req.body);

    let result;
    if (data.provider === 'stripe') {
      result = await paymentGatewayService.createStripePaymentIntent({
        amount: data.amount,
        currency: data.currency,
        orderId: data.orderId,
        metadata: {
          createdBy: req.user!.userId,
          customerEmail: data.customerEmail || '',
        },
      });
    } else {
      result = await paymentGatewayService.createSquarePayment({
        amount: data.amount,
        currency: data.currency,
        orderId: data.orderId,
      });
    }

    logger.info(`Payment intent created for order ${sanitize(data.orderId)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Confirm payment
router.post('/confirm', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = confirmPaymentSchema.parse(req.body);

    let result;
    if (data.provider === 'stripe') {
      result = await paymentGatewayService.confirmStripePayment(data.paymentIntentId);
    } else {
      throw new AppError('Square confirmation not yet implemented', 501);
    }

    logger.info(`Payment confirmed: ${sanitize(data.paymentIntentId)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Process refund
router.post('/refund', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = refundSchema.parse(req.body);

    // Verify manager PIN if configured
    const { managerPin } = req.body;
    if (process.env.REQUIRE_MANAGER_PIN_FOR_REFUND === 'true') {
      if (!managerPin) {
        throw new AppError('Manager PIN required for refunds', 403);
      }
      // Verify PIN logic here
    }

    let result;
    if (data.provider === 'stripe') {
      result = await paymentGatewayService.processStripeRefund({
        paymentIntentId: data.paymentIntentId,
        amount: data.amount,
        reason: data.reason,
      });
    } else {
      throw new AppError('Square refund not yet implemented', 501);
    }

    logger.info(`Refund processed for payment ${sanitize(data.paymentIntentId)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Stripe webhook endpoint (no authentication - uses signature verification)
router.post('/webhooks/stripe', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      throw new AppError('Stripe signature missing', 400);
    }

    const result = await paymentGatewayService.handleStripeWebhook(req.body, signature);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get saved payment methods for a customer
router.get('/methods/:customerId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { provider = 'stripe' } = req.query;

    let methods;
    if (provider === 'stripe') {
      methods = await paymentGatewayService.getStripePaymentMethods(customerId);
    } else {
      throw new AppError('Square methods not yet implemented', 501);
    }

    res.json({
      success: true,
      data: { methods },
    });
  } catch (error) {
    next(error);
  }
});

// Payment status check
router.get('/status/:paymentIntentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentIntentId } = req.params;
    const { provider = 'stripe' } = req.query;

    // Implementation would check payment status with provider
    res.json({
      success: true,
      data: {
        paymentIntentId,
        provider,
        status: 'pending', // Placeholder
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
