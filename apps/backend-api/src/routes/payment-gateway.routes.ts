import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { paymentGatewayService } from '../services/paymentGateway.service';
import { prisma } from '../config/database';
import { logger, sanitize } from '../utils/logger';
import { verifyAndUpgradeSecret } from '../utils/pinSecurity';

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

    // Verify manager PIN
    const { managerPin } = req.body;
    if (!managerPin) {
      throw new AppError('Manager PIN required for refunds', 403);
    }

    const managerPinSetting = await prisma.setting.findUnique({
      where: { key: 'manager_pin' },
    });

    if (!managerPinSetting) {
      throw new AppError('Manager PIN not configured', 500);
    }

    const isValidPin = await verifyAndUpgradeSecret(managerPin, managerPinSetting.value, async (hashedPin) => {
      await prisma.setting.update({
        where: { key: managerPinSetting.key },
        data: { value: hashedPin },
      });
    });
    if (!isValidPin) {
      logger.warn(`Failed refund PIN validation for payment ${data.paymentIntentId}`);
      throw new AppError('Invalid manager PIN', 401);
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
// Note: This route must use express.raw() middleware for signature verification
router.post('/webhooks/stripe', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      throw new AppError('Stripe signature missing', 400);
    }

    // req.body is a Buffer due to express.raw() middleware
    const payload = req.body as Buffer;
    if (!payload) {
      throw new AppError('Request body missing', 400);
    }

    const result = await paymentGatewayService.handleStripeWebhook(payload, signature);

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

    let status;
    let paymentDetails;

    if (provider === 'stripe') {
      const result = await paymentGatewayService.confirmStripePayment(paymentIntentId);
      if (result.success) {
        status = result.status;
        paymentDetails = {
          amount: result.amount,
          currency: result.currency,
          receiptUrl: result.receiptUrl,
        };
      } else {
        status = result.status;
        paymentDetails = {
          requiresAction: result.requiresAction,
          clientSecret: result.clientSecret,
        };
      }
    } else {
      throw new AppError('Square status check not yet implemented', 501);
    }

    res.json({
      success: true,
      data: {
        paymentIntentId,
        provider,
        status,
        paymentDetails,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
