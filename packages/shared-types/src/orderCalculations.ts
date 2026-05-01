/**
 * Shared Order Calculation Utilities
 * Used by both frontend and backend to ensure consistent calculations
 */

export interface OrderItem {
  id?: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  discount?: number;
  notes?: string;
  modifiers?: string;
}

export interface TaxRate {
  name: string;
  rate: number; // percentage (e.g., 8.5 for 8.5%)
  isInclusive: boolean;
}

export interface Surcharge {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
}

export interface OrderCalculationResult {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  surchargesTotal: number;
  tipAmount: number;
  total: number;
  breakdown: {
    items: Array<{
      item: OrderItem;
      itemTotal: number;
      itemDiscount: number;
    }>;
    surcharges: Array<{
      surcharge: Surcharge;
      amount: number;
    }>;
  };
}

export interface CalculationParams {
  items: OrderItem[];
  discountPercent?: number;
  discountAmount?: number;
  taxRate?: number;
  serviceChargeRate?: number;
  surcharges?: Surcharge[];
  tipAmount?: number;
}

/**
 * Calculate order totals with full breakdown.
 *
 * QA D49 / B12 / A45: every accumulator passes through `roundToCents` at the
 * boundaries to stop float drift compounding across many items. Tax base is
 * documented and codified: taxable = max(0, subtotal - discount); tax applies
 * to that base; surcharges and service charge ALSO apply to the same base so
 * the formula is consistent across the codebase.
 */
export function calculateOrderTotals(params: CalculationParams): OrderCalculationResult {
  const {
    items,
    discountPercent = 0,
    discountAmount: fixedDiscount = 0,
    taxRate = 0,
    serviceChargeRate = 0,
    surcharges = [],
    tipAmount = 0,
  } = params;

  const itemBreakdown = items.map(item => {
    const itemTotal = roundToCents(item.price * item.quantity);
    const itemDiscount = roundToCents((item.discount || 0) * item.quantity);
    return { item, itemTotal, itemDiscount };
  });

  const subtotal = roundToCents(itemBreakdown.reduce((sum, i) => sum + i.itemTotal, 0));
  const itemsDiscount = itemBreakdown.reduce((sum, i) => sum + i.itemDiscount, 0);

  const percentageDiscount = subtotal * (discountPercent / 100);
  const totalDiscount = percentageDiscount + fixedDiscount + itemsDiscount;
  // Cap discount at subtotal — never produce a negative taxable amount.
  const discountAmount = roundToCents(Math.min(Math.max(totalDiscount, 0), subtotal));
  const taxableAmount = roundToCents(Math.max(0, subtotal - discountAmount));

  const taxAmount = roundToCents(taxableAmount * (taxRate / 100));
  const serviceChargeAmount = roundToCents(taxableAmount * (serviceChargeRate / 100));

  const surchargeBreakdown = surcharges.map(surcharge => {
    const amount = surcharge.type === 'PERCENTAGE'
      ? roundToCents(taxableAmount * (surcharge.value / 100))
      : roundToCents(surcharge.value);
    return { surcharge, amount };
  });

  const surchargesTotal = roundToCents(surchargeBreakdown.reduce((sum, s) => sum + s.amount, 0));
  const total = roundToCents(taxableAmount + taxAmount + serviceChargeAmount + surchargesTotal + Math.max(0, tipAmount));

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    serviceChargeAmount,
    surchargesTotal,
    tipAmount: roundToCents(Math.max(0, tipAmount)),
    total,
    breakdown: { items: itemBreakdown, surcharges: surchargeBreakdown },
  };
}

/**
 * Quick subtotal calculation
 */
export function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/**
 * Calculate change for cash payments
 */
export function calculateChange(total: number, cashReceived: number): number {
  return Math.max(0, cashReceived - total);
}

/**
 * Format money amount (simple version for internal use)
 * For full currency formatting with symbols, use formatCurrency from './currency'
 */
export function formatMoney(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Validate split payment amounts
 */
export function validateSplitPayment(
  payments: Array<{ method: string; amount: number }>,
  total: number,
  tolerance?: number
): { valid: boolean; difference: number; message?: string } {
  // QA D50: reject negative amounts outright and scale tolerance with the
  // number of splits — three-way splits accumulate more rounding error than two-way.
  if (payments.some((p) => !Number.isFinite(p.amount) || p.amount < 0)) {
    return {
      valid: false,
      difference: 0,
      message: 'Split payment amounts must be non-negative numbers',
    };
  }
  const effectiveTolerance = tolerance ?? Math.max(0.01, payments.length * 0.005);
  const totalPaid = roundToCents(payments.reduce((sum, p) => sum + p.amount, 0));
  const difference = Math.abs(totalPaid - total);

  if (difference <= effectiveTolerance) {
    return { valid: true, difference: 0 };
  }

  if (totalPaid < total) {
    return {
      valid: false,
      difference: total - totalPaid,
      message: `Underpaid by ${formatMoney(total - totalPaid)}`,
    };
  }

  return {
    valid: false,
    difference: totalPaid - total,
    message: `Overpaid by ${formatMoney(totalPaid - total)}`,
  };
}

/**
 * Round to nearest cent (handles floating point issues)
 */
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculate discount for display
 */
export function calculateDiscountDisplay(
  subtotal: number,
  discountPercent?: number,
  discountAmount?: number
): { label: string; amount: number } {
  if (discountPercent && discountPercent > 0) {
    const amount = roundToCents(subtotal * (discountPercent / 100));
    return {
      label: `${discountPercent}% Discount`,
      amount,
    };
  }
  
  if (discountAmount && discountAmount > 0) {
    return {
      label: 'Discount',
      amount: discountAmount,
    };
  }
  
  return { label: 'Discount', amount: 0 };
}
