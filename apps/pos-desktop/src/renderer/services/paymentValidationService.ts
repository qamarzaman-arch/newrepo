/**
 * Payment Validation Service
 * Handles payment processing, validation, and error recovery
 */

import { orderService } from './orderService';
import toast from 'react-hot-toast';
import { toNum } from '@restaurant-pos/shared-types';

export interface PaymentRequest {
  orderId: string;
  method: 'CASH' | 'CARD' | 'SPLIT';
  amount: number;
  cashReceived?: number;
  splitPayments?: Array<{
    method: 'CASH' | 'CARD';
    amount: number;
  }>;
  cardLastFour?: string;
  notes?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
  requiresRollback?: boolean;
  orderId?: string;
}

class PaymentValidationService {
  private processingPayments: Set<string> = new Set();
  private readonly PAYMENT_TIMEOUT = 30000; // 30 seconds

  /**
   * Validate payment amounts before processing
   */
  private validatePaymentAmounts(request: PaymentRequest, orderTotal: number): { valid: boolean; error?: string } {
    const TOLERANCE = 0.01; // 1 cent tolerance for rounding

    if (request.method === 'CASH') {
      if (!request.cashReceived || request.cashReceived < request.amount) {
        return {
          valid: false,
          error: 'Cash received is less than order total',
        };
      }
    }

    if (request.method === 'SPLIT') {
      if (!request.splitPayments || request.splitPayments.length === 0) {
        return {
          valid: false,
          error: 'Split payment requires at least one payment method',
        };
      }

      const splitTotal = request.splitPayments.reduce((sum, p) => sum + p.amount, 0);
      
      if (Math.abs(splitTotal - request.amount) > TOLERANCE) {
        return {
          valid: false,
          error: `Split payment total (${toNum(splitTotal).toFixed(2)}) does not match order total (${toNum(request.amount).toFixed(2)})`,
        };
      }

      // Validate cash portion if exists
      const cashPayment = request.splitPayments.find(p => p.method === 'CASH');
      if (cashPayment && request.cashReceived && request.cashReceived < cashPayment.amount) {
        return {
          valid: false,
          error: 'Cash received is less than cash portion of split payment',
        };
      }
    }

    // Validate amount matches order total
    if (Math.abs(request.amount - orderTotal) > TOLERANCE) {
      return {
        valid: false,
        error: `Payment amount (${toNum(request.amount).toFixed(2)}) does not match order total (${toNum(orderTotal).toFixed(2)})`,
      };
    }

    return { valid: true };
  }

  /**
   * Check if payment is already being processed (prevent duplicates)
   */
  private isProcessing(orderId: string): boolean {
    return this.processingPayments.has(orderId);
  }

  /**
   * Mark payment as processing
   */
  private startProcessing(orderId: string): void {
    this.processingPayments.add(orderId);
    
    // Auto-cleanup after timeout
    setTimeout(() => {
      this.processingPayments.delete(orderId);
    }, this.PAYMENT_TIMEOUT);
  }

  /**
   * Mark payment as complete
   */
  private endProcessing(orderId: string): void {
    this.processingPayments.delete(orderId);
  }

  /**
   * Process a payment with validation and error handling
   */
  public async processPayment(request: PaymentRequest, orderTotal: number): Promise<PaymentResult> {
    // Check for duplicate processing
    if (this.isProcessing(request.orderId)) {
      return {
        success: false,
        error: 'Payment is already being processed for this order',
      };
    }

    // Validate payment amounts
    const validation = this.validatePaymentAmounts(request, orderTotal);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    this.startProcessing(request.orderId);

    try {
      if (request.method === 'SPLIT' && request.splitPayments) {
        // Process split payments sequentially
        const paymentIds: string[] = [];
        
        for (const payment of request.splitPayments) {
          try {
            const response = await orderService.processPayment(request.orderId, {
              method: payment.method,
              amount: payment.amount,
              notes: request.notes ? `${request.notes} (Split payment - ${payment.method})` : `Split payment - ${payment.method}`,
            });

            if (response.data.success) {
              paymentIds.push(response.data.data.payment.id);
            } else {
              throw new Error(`Failed to process ${payment.method} payment`);
            }
          } catch (error: any) {
            // Rollback previous payments if one fails
            console.error('Split payment failed, attempting rollback:', error);
            
            for (const paymentId of paymentIds) {
              try {
                await this.rollbackPayment(request.orderId, paymentId);
              } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
              }
            }

            this.endProcessing(request.orderId);
            return {
              success: false,
              error: error.response?.data?.message || error.message || 'Split payment failed',
              requiresRollback: true,
              orderId: request.orderId,
            };
          }
        }

        this.endProcessing(request.orderId);
        return {
          success: true,
          paymentId: paymentIds.join(','),
          orderId: request.orderId,
        };
      } else {
        // Process single payment
        const response = await orderService.processPayment(request.orderId, {
          method: request.method,
          amount: request.amount,
          notes: request.notes,
        });

        this.endProcessing(request.orderId);

        if (response.data.success) {
          return {
            success: true,
            paymentId: response.data.data.payment.id,
            orderId: request.orderId,
          };
        } else {
          return {
            success: false,
            error: 'Payment processing failed',
            orderId: request.orderId,
          };
        }
      }
    } catch (error: any) {
      this.endProcessing(request.orderId);
      console.error('Payment processing error:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Payment processing failed',
        orderId: request.orderId,
      };
    }
  }

  /**
   * Rollback a payment (for failed split payments)
   */
  private async rollbackPayment(orderId: string, paymentId: string): Promise<void> {
    try {
      // In a real system, this would call a refund/void endpoint
      console.log(`Rolling back payment ${paymentId} for order ${orderId}`);
      // await orderService.voidPayment(orderId, paymentId);
    } catch (error) {
      console.error('Failed to rollback payment:', error);
      throw error;
    }
  }

  /**
   * Validate card payment (for manual terminals)
   */
  public async validateCardPayment(amount: number, cardLastFour?: string): Promise<{ success: boolean; error?: string }> {
    // In a real system, this would integrate with payment gateway
    // For now, we simulate validation
    
    if (amount <= 0) {
      return {
        success: false,
        error: 'Invalid payment amount',
      };
    }

    // Simulate card validation delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
    };
  }

  /**
   * Calculate change with proper rounding
   */
  public calculateChange(cashReceived: number, total: number): number {
    const change = cashReceived - total;
    // Round to 2 decimal places to avoid floating point errors
    return Math.round(change * 100) / 100;
  }

  /**
   * Validate split payment distribution
   */
  public validateSplitPayment(
    splitPayments: Array<{ method: string; amount: number }>,
    total: number
  ): { valid: boolean; error?: string; difference?: number } {
    const TOLERANCE = 0.01;
    
    if (!splitPayments || splitPayments.length === 0) {
      return {
        valid: false,
        error: 'No payment methods specified',
      };
    }

    const splitTotal = splitPayments.reduce((sum, p) => sum + p.amount, 0);
    const difference = Math.abs(splitTotal - total);

    if (difference > TOLERANCE) {
      return {
        valid: false,
        error: `Split payment total does not match order total`,
        difference,
      };
    }

    // Check for negative amounts
    const hasNegative = splitPayments.some(p => p.amount < 0);
    if (hasNegative) {
      return {
        valid: false,
        error: 'Payment amounts cannot be negative',
      };
    }

    return { valid: true };
  }

  /**
   * Get payment status
   */
  public isPaymentProcessing(orderId: string): boolean {
    return this.processingPayments.has(orderId);
  }

  /**
   * Clear processing status (use with caution)
   */
  public clearProcessingStatus(orderId: string): void {
    this.processingPayments.delete(orderId);
  }
}

// Singleton instance
let paymentValidationService: PaymentValidationService | null = null;

export const getPaymentValidationService = (): PaymentValidationService => {
  if (!paymentValidationService) {
    paymentValidationService = new PaymentValidationService();
  }
  return paymentValidationService;
};

export default PaymentValidationService;
