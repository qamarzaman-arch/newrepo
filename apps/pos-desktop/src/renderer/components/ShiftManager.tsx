import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, DollarSign, Lock, LogOut, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { cashDrawerService, CashDrawer } from '../services/cashDrawerService';
import { validationService } from '../services/validationService';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

interface ShiftManagerProps {
  children: React.ReactNode;
}

const ShiftManager: React.FC<ShiftManagerProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const { formatCurrency } = useCurrencyFormatter();
  const [cashDrawer, setCashDrawer] = useState<CashDrawer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Shift start modal state
  const [showStartModal, setShowStartModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [isValidatingPin, setIsValidatingPin] = useState(false);
  
  // Shift end modal state
  const [showEndModal, setShowEndModal] = useState(false);
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [endShiftManagerPin, setEndShiftManagerPin] = useState('');
  const [expectedBalance, setExpectedBalance] = useState(0);

  // Check for active shift on mount
  useEffect(() => {
    checkActiveShift();
  }, []);

  const checkActiveShift = async () => {
    try {
      setIsLoading(true);
      const response = await cashDrawerService.getCurrent();
      const drawer = response.data.data?.drawer;
      
      if (drawer && drawer.status === 'open') {
        setCashDrawer(drawer);
        setShowStartModal(false);
      } else {
        setCashDrawer(null);
        setShowStartModal(true);
      }
    } catch (error) {
      console.error('Failed to check shift status:', error);
      setShowStartModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const validateManagerPin = async (pin: string): Promise<boolean> => {
    try {
      const isValid = await validationService.validateManagerPin(pin, 'shift_management');
      return isValid;
    } catch {
      return false;
    }
  };

  const handleStartShift = async () => {
    if (!openingBalance || parseFloat(openingBalance) < 0) {
      toast.error('Please enter a valid opening balance');
      return;
    }

    if (!managerPin || managerPin.length < 4) {
      toast.error('Please enter a valid manager PIN');
      return;
    }

    setIsValidatingPin(true);
    try {
      const isValid = await validateManagerPin(managerPin);
      if (!isValid) {
        toast.error('Invalid manager PIN');
        return;
      }

      const response = await cashDrawerService.open({
        openingBalance: parseFloat(openingBalance),
      });

      setCashDrawer(response.data.data.drawer);
      toast.success('Shift started successfully!');
      setShowStartModal(false);
      setManagerPin('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start shift');
    } finally {
      setIsValidatingPin(false);
    }
  };

  const handleEndShift = async () => {
    if (!closingBalance) {
      toast.error('Please enter closing balance');
      return;
    }

    if (!endShiftManagerPin) {
      toast.error('Please enter manager PIN');
      return;
    }

    setIsValidatingPin(true);
    try {
      const isValid = await validateManagerPin(endShiftManagerPin);
      if (!isValid) {
        toast.error('Invalid manager PIN');
        return;
      }

      if (!cashDrawer) return;

      const closing = parseFloat(closingBalance);
      const response = await cashDrawerService.close(cashDrawer.id, {
        closingBalance: closing,
        expectedBalance: expectedBalance,
        closingNotes: closingNotes || undefined,
      });

      const discrepancy = response.data.data.drawer.discrepancy;
      
      if (discrepancy && discrepancy !== 0) {
        toast(`Shift ended. Discrepancy: ${formatCurrency(discrepancy)}`, {
          icon: '⚠️',
          style: { background: '#FEF3C7', color: '#92400E' }
        });
      } else {
        toast.success('Shift ended successfully! Balanced.');
      }

      setCashDrawer(null);
      setShowEndModal(false);
      setShowStartModal(true);
      setClosingBalance('');
      setClosingNotes('');
      setEndShiftManagerPin('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to end shift');
    } finally {
      setIsValidatingPin(false);
    }
  };

  const openEndShiftModal = async () => {
    if (!cashDrawer) return;
    
    // Calculate expected balance
    try {
      const response = await cashDrawerService.getCurrent();
      const drawer = response.data.data?.drawer;
      if (drawer) {
        const expected = drawer.openingBalance + drawer.totalCashIn - drawer.totalCashOut + drawer.totalSales;
        setExpectedBalance(expected);
        setClosingBalance(expected.toFixed(2));
      }
    } catch {
      setExpectedBalance(cashDrawer.openingBalance);
      setClosingBalance(cashDrawer.openingBalance.toFixed(2));
    }
    
    setShowEndModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      {/* Shift Status Bar */}
      {cashDrawer && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              Shift Active - Drawer: {formatCurrency(cashDrawer.openingBalance)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-white/20 px-2 py-1 rounded">
              Sales: {formatCurrency(cashDrawer.totalSales)}
            </span>
            <button
              onClick={openEndShiftModal}
              className="text-xs bg-red-500 hover:bg-red-600 px-3 py-1 rounded font-medium transition-colors"
            >
              End Shift
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {children}

      {/* Start Shift Modal */}
      <AnimatePresence>
        {showStartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Start Your Shift</h2>
                <p className="text-gray-500 mt-2">
                  Enter your opening cash balance and manager PIN to start
                </p>
              </div>

              <div className="space-y-4">
                {/* Opening Balance */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Opening Cash in Hand
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-lg"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>

                {/* Manager PIN */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Manager PIN Required
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={managerPin}
                    onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleStartShift();
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-lg tracking-widest"
                    placeholder="••••"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Manager authorization required to start shift
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => logout()}
                    className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                  <button
                    onClick={handleStartShift}
                    disabled={isValidatingPin}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isValidatingPin ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Start Shift
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Shift Modal */}
      <AnimatePresence>
        {showEndModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">End Your Shift</h2>
                <p className="text-gray-500 mt-2">
                  Count your cash and enter closing balance
                </p>
              </div>

              <div className="space-y-4">
                {/* Expected Balance */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600 font-medium">Expected Balance</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(expectedBalance)}</p>
                </div>

                {/* Closing Balance */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Actual Cash Count
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-lg"
                    placeholder="0.00"
                  />
                </div>

                {/* Discrepancy Warning */}
                {parseFloat(closingBalance) !== expectedBalance && closingBalance && (
                  <div className="bg-yellow-50 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Discrepancy Detected
                      </p>
                      <p className="text-sm text-yellow-700">
                        Difference: {formatCurrency(parseFloat(closingBalance) - expectedBalance)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm"
                    placeholder="Any notes about discrepancy or issues..."
                    rows={2}
                  />
                </div>

                {/* Manager PIN */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Manager PIN Required
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={endShiftManagerPin}
                    onChange={(e) => setEndShiftManagerPin(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleEndShift();
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-lg tracking-widest"
                    placeholder="••••"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowEndModal(false)}
                    className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEndShift}
                    disabled={isValidatingPin}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isValidatingPin ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    End Shift
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ShiftManager;
