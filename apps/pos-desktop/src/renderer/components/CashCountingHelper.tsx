import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Banknote, Calculator, X } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

interface CashCountingHelperProps {
  onTotalCalculated: (total: number) => void;
  currencyCode?: string;
  expectedAmount?: number;
}

interface Denomination {
  value: number;
  count: number;
  label: string;
}

const CashCountingHelper: React.FC<CashCountingHelperProps> = ({
  onTotalCalculated,
  currencyCode = 'USD',
  expectedAmount = 0,
}) => {
  const [denominations, setDenominations] = useState<Denomination[]>([
    { value: 100, count: 0, label: '$100' },
    { value: 50, count: 0, label: '$50' },
    { value: 20, count: 0, label: '$20' },
    { value: 10, count: 0, label: '$10' },
    { value: 5, count: 0, label: '$5' },
    { value: 1, count: 0, label: '$1' },
    { value: 0.25, count: 0, label: '25¢' },
    { value: 0.10, count: 0, label: '10¢' },
    { value: 0.05, count: 0, label: '5¢' },
    { value: 0.01, count: 0, label: '1¢' },
  ]);

  const total = denominations.reduce((sum, denom) => sum + denom.value * denom.count, 0);
  const difference = total - expectedAmount;

  useEffect(() => {
    onTotalCalculated(total);
  }, [total, onTotalCalculated]);

  const updateCount = (index: number, delta: number) => {
    setDenominations((prev) =>
      prev.map((denom, i) =>
        i === index ? { ...denom, count: Math.max(0, denom.count + delta) } : denom
      )
    );
  };

  const setCount = (index: number, count: number) => {
    const numCount = parseInt(count.toString()) || 0;
    setDenominations((prev) =>
      prev.map((denom, i) => (i === index ? { ...denom, count: Math.max(0, numCount) } : denom))
    );
  };

  const clearAll = () => {
    setDenominations((prev) => prev.map((denom) => ({ ...denom, count: 0 })));
  };

  const quickFill = () => {
    if (expectedAmount <= 0) return;
    
    let remaining = expectedAmount;
    const newDenominations = [...denominations];
    
    for (let i = 0; i < newDenominations.length; i++) {
      const count = Math.floor(remaining / newDenominations[i].value);
      newDenominations[i].count = count;
      remaining -= count * newDenominations[i].value;
      remaining = Math.round(remaining * 100) / 100; // Fix floating point issues
    }
    
    setDenominations(newDenominations);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Cash Counting Helper
        </h3>
        <div className="flex gap-2">
          {expectedAmount > 0 && (
            <button
              onClick={quickFill}
              className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              Quick Fill
            </button>
          )}
          <button
            onClick={clearAll}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Bills */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bills</p>
        <div className="grid grid-cols-2 gap-3">
          {denominations.slice(0, 6).map((denom, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">{denom.label}</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(denom.value * denom.count, currencyCode)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => updateCount(index, -1)}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700 font-bold">−</span>
                </motion.button>
                <input
                  type="number"
                  min="0"
                  value={denom.count || ''}
                  onChange={(e) => setCount(index, parseInt(e.target.value) || 0)}
                  className="flex-1 text-center px-2 py-1.5 bg-white border border-gray-300 rounded-lg font-bold text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => updateCount(index, 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700 font-bold">+</span>
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coins */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Coins</p>
        <div className="grid grid-cols-2 gap-3">
          {denominations.slice(6).map((denom, index) => (
            <div key={index + 6} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">{denom.label}</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(denom.value * denom.count, currencyCode)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => updateCount(index + 6, -1)}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700 font-bold">−</span>
                </motion.button>
                <input
                  type="number"
                  min="0"
                  value={denom.count || ''}
                  onChange={(e) => setCount(index + 6, parseInt(e.target.value) || 0)}
                  className="flex-1 text-center px-2 py-1.5 bg-white border border-gray-300 rounded-lg font-bold text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => updateCount(index + 6, 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700 font-bold">+</span>
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Summary */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Counted</span>
          <span className="text-2xl font-black text-primary">{formatCurrency(total, currencyCode)}</span>
        </div>
        
        {expectedAmount > 0 && (
          <>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Expected Amount</span>
              <span className="font-semibold text-gray-900">{formatCurrency(expectedAmount, currencyCode)}</span>
            </div>
            <div className={`flex justify-between items-center p-3 rounded-xl ${
              Math.abs(difference) < 0.01
                ? 'bg-green-50 border border-green-200'
                : difference > 0
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <span className={`font-semibold ${
                Math.abs(difference) < 0.01
                  ? 'text-green-700'
                  : difference > 0
                  ? 'text-blue-700'
                  : 'text-red-700'
              }`}>
                {Math.abs(difference) < 0.01
                  ? '✓ Balanced'
                  : difference > 0
                  ? 'Overage'
                  : 'Shortage'}
              </span>
              <span className={`text-lg font-bold ${
                Math.abs(difference) < 0.01
                  ? 'text-green-700'
                  : difference > 0
                  ? 'text-blue-700'
                  : 'text-red-700'
              }`}>
                {Math.abs(difference) < 0.01
                  ? formatCurrency(0, currencyCode)
                  : (difference > 0 ? '+' : '') + formatCurrency(difference, currencyCode)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Breakdown Summary */}
      {total > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-xl">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Breakdown</p>
          <div className="space-y-1">
            {denominations
              .filter((d) => d.count > 0)
              .map((denom, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {denom.count}x {denom.label}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(denom.value * denom.count, currencyCode)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CashCountingHelper;
