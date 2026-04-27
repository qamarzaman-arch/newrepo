import Stripe from 'stripe';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

// Initialize Stripe only if API key is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {})
  : null;

// Square SDK import (if needed)
// import { Client, Environment } from 'square';

export interface PaymentIntentData {
  amount: number; // in cents
  currency: string;
  orderId: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface RefundData {
  paymentIntentId: string;
  amount?: number; // partial refund amount in cents, omit for full refund
  reason?: string;
}

export class PaymentGatewayService {
  // Create Stripe Payment Intent
  async createStripePaymentIntent(data: PaymentIntentData) {
    if (!stripe) {
      throw new AppError('Stripe not configured. Please set STRIPE_SECRET_KEY environment variable.', 500);
    }
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: data.amount,
        currency: data.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          orderId: data.orderId,
          ...data.metadata,
        },
        receipt_email: undefined, // Can be set if customer email available
      });

      logger.info(`Stripe PaymentIntent created: ${sanitize(paymentIntent.id)} for order ${sanitize(data.orderId)}`);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    } catch (error: any) {
      logger.error(`Stripe PaymentIntent failed: ${error.message}`);
      throw new AppError(`Payment processing failed: ${error.message}`, 400);
    }
  }

  // Confirm Stripe Payment Intent
  async confirmStripePayment(paymentIntentId: string) {
    if (!stripe) {
      throw new AppError('Stripe not configured. Please set STRIPE_SECRET_KEY environment variable.', 500);
    }
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        logger.info(`Stripe payment confirmed: ${sanitize(paymentIntentId)}`);
        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          receiptUrl: null, // Receipt URL available via separate API call if needed
        };
      } else {
        return {
          success: false,
          status: paymentIntent.status,
          requiresAction: paymentIntent.status === 'requires_action',
          clientSecret: paymentIntent.client_secret,
        };
      }
    } catch (error: any) {
      logger.error(`Stripe payment confirmation failed: ${error.message}`);
      throw new AppError(`Payment confirmation failed: ${error.message}`, 400);
    }
  }

  // Process Stripe Refund
  async processStripeRefund(data: RefundData) {
    if (!stripe) {
      throw new AppError('Stripe not configured. Please set STRIPE_SECRET_KEY environment variable.', 500);
    }
    try {
      const refund = await stripe.refunds.create({
        payment_intent: data.paymentIntentId,
        amount: data.amount, // undefined for full refund
        reason: 'requested_by_customer',
        metadata: {
          reason: data.reason || 'Customer requested refund',
        },
      });

      logger.info(`Stripe refund processed: ${sanitize(refund.id)} for payment ${sanitize(data.paymentIntentId)}`);

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        currency: refund.currency,
      };
    } catch (error: any) {
      logger.error(`Stripe refund failed: ${error.message}`);
      throw new AppError(`Refund processing failed: ${error.message}`, 400);
    }
  }

  // Square Payment
  async createSquarePayment(data: PaymentIntentData) {
    throw new AppError('Square integration is not enabled. Please use Stripe for payment processing.', 501);
  }

  // Webhook handler for Stripe events
  async handleStripeWebhook(payload: any, signature: string) {
    if (!stripe) {
      throw new AppError('Stripe not configured. Please set STRIPE_SECRET_KEY environment variable.', 500);
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new AppError('Stripe webhook secret not configured', 500);
    }

    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      logger.info(`Stripe webhook received: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          // Handle successful payment
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          logger.info(`Payment succeeded: ${sanitize(paymentIntent.id)}`);
          // Update order status, send confirmation, etc.
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object as Stripe.PaymentIntent;
          logger.warn(`Payment failed: ${sanitize(failedPayment.id)}`);
          // Handle failed payment
          break;

        case 'charge.refunded':
          const refund = event.data.object as Stripe.Charge;
          logger.info(`Refund processed: ${sanitize(refund.id)}`);
          // Handle refund
          break;

        default:
          logger.info(`Unhandled Stripe event: ${event.type}`);
      }

      return { received: true };
    } catch (error: any) {
      logger.error(`Stripe webhook error: ${error.message}`);
      throw new AppError(`Webhook error: ${error.message}`, 400);
    }
  }

  // Get payment methods for a customer
  async getStripePaymentMethods(customerId: string) {
    if (!stripe) {
      throw new AppError('Stripe not configured. Please set STRIPE_SECRET_KEY environment variable.', 500);
    }
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      }));
    } catch (error: any) {
      logger.error(`Failed to get payment methods: ${error.message}`);
      throw new AppError(`Failed to get payment methods: ${error.message}`, 400);
    }
  }
}

export const paymentGatewayService = new PaymentGatewayService();
export default paymentGatewayService;
