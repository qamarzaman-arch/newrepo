import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, DollarSign, ShoppingCart, TrendingUp, 
  ArrowLeft, Printer, Download, CheckCircle,
  CreditCard, Shield, AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { staffService } from '@/services/staffService';
import { reportService } from '@/services/reportService';
import { validationService } from '@/services/validationService';
import { cashDrawerService, CashDrawer } from '@/services/cashDrawerService';
import { logAction } from '@/services/auditLogService';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/utils/currency';
import toast from 'react-hot-toast';

const ShiftSummary: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isEndingShift, setIsEndingShift] = React.useState(false);
  const [isEditingOpeningBalance, setIsEditingOpeningBalance] = React.useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = React.useState('');
  const [showClosingModal, setShowClosingModal] = React.useState(false);
  const [closingBalanceInput, setClosingBalanceInput] = React.useState('');
  const [closingNotes, setClosingNotes] = React.useState('');
  const [managerPin, setManagerPin] = React.useState('');
  const [pinError, setPinError] = React.useState('');
  const [showPinInput, setShowPinInput] = React.useState(false);
  const [cashDrawer, setCashDrawer] = React.useState<CashDrawer | null>(null);
  const [, setIsLoadingDrawer] = React.useState(false);

  // Load opening balance from localStorage or default to 0
  const [openingBalance, setOpeningBalance] = React.useState(() => {
    const saved = localStorage.getItem('pos_opening_balance');
    return saved ? parseFloat(saved) : 0;
  });

  // Load shift start time from localStorage or use current time
  const shiftStartTime = React.useMemo(() => {
    const saved = localStorage.getItem('pos_shift_start_time');
    return saved ? new Date(saved) : new Date();
  }, []);

  // Fetch per-cashier shift summary instead of restaurant-wide daily sales
  const { data: shiftSummary } = useQuery({
    queryKey: ['shift-summary', user?.id],
    queryFn: async () => {
      const response = await reportService.getShiftSummary();
      return response.data.data;
    },
  });

  // Load or create cash drawer on mount
  React.useEffect(() => {
    const initCashDrawer = async () => {
      setIsLoadingDrawer(true);
      try {
        // Check for existing open drawer
        const response = await cashDrawerService.getCurrent();
        const existingDrawer = response.data.data?.drawer;

        if (existingDrawer) {
          setCashDrawer(existingDrawer);
          // Sync opening balance with server
          setOpeningBalance(existingDrawer.openingBalance);
          localStorage.setItem('pos_opening_balance', existingDrawer.openingBalance.toString());
          localStorage.setItem('pos_cash_drawer_id', existingDrawer.id);
        } else {
          // No open drawer - check if we should create one from localStorage
          const savedBalance = localStorage.getItem('pos_opening_balance');
          if (savedBalance && user?.id) {
            try {
              const openResponse = await cashDrawerService.open({
                openingBalance: parseFloat(savedBalance),
              });
              setCashDrawer(openResponse.data.data.drawer);
              localStorage.setItem('pos_cash_drawer_id', openResponse.data.data.drawer.id);
              
              // Log cash drawer open
              await logAction('CASH_DRAWER_OPEN', 'CashDrawer', openResponse.data.data.drawer.id, {
                openingBalance: parseFloat(savedBalance),
                sessionNumber: openResponse.data.data.drawer.sessionNumber,
              });
            } catch (error) {
              console.error('Failed to open cash drawer:', error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load cash drawer:', error);
      } finally {
        setIsLoadingDrawer(false);
      }
    };

    initCashDrawer();
  }, [user?.id]);

  const shiftData = {
    startTime: shiftStartTime,
    endTime: new Date(),
    cashierName: shiftSummary?.cashierName || user?.fullName || 'Cashier',
    openingBalance,
    cashSales: shiftSummary?.paymentMethodBreakdown?.CASH || 0,
    cardSales: (shiftSummary?.paymentMethodBreakdown?.CARD || 0) + (shiftSummary?.paymentMethodBreakdown?.CREDIT || 0),
    totalOrders: shiftSummary?.totalOrders || 0,
    voidedOrders: shiftSummary?.voidedOrders || 0,
    refunds: shiftSummary?.refunds || 0,
    tips: shiftSummary?.tips || 0,
  };

  const totalSales = shiftData.cashSales + shiftData.cardSales;
  const expectedDrawer = shiftData.openingBalance + shiftData.cashSales - shiftData.refunds;
  const actualDrawer = expectedDrawer + shiftData.tips; // Assuming tips are kept in drawer

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportReport = () => {
    // In production, this would generate CSV/PDF
    const reportData = `
Shift Summary Report
===================
Cashier: ${shiftData.cashierName}
Start Time: ${shiftData.startTime.toLocaleString()}
End Time: ${shiftData.endTime.toLocaleString()}

Opening Balance: ${formatCurrency(shiftData.openingBalance)}
Cash Sales: ${formatCurrency(shiftData.cashSales)}
Card Sales: ${formatCurrency(shiftData.cardSales)}
Total Sales: ${formatCurrency(totalSales)}
Refunds: ${formatCurrency(shiftData.refunds)}
Tips: ${formatCurrency(shiftData.tips)}
Expected Drawer: ${formatCurrency(expectedDrawer)}
Actual Drawer: ${formatCurrency(actualDrawer)}
Total Orders: ${shiftData.totalOrders}
Voided Orders: ${shiftData.voidedOrders}
    `.trim();

    const blob = new Blob([reportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift-summary-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/cashier-pos')}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md border border-gray-200 hover:border-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
            <span className="font-semibold text-gray-700">Back to POS</span>
          </motion.button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary" />
              Shift Summary
            </h1>
            <p className="text-gray-600 mt-1">
              {shiftData.cashierName} • {shiftData.startTime.toLocaleTimeString()} - {shiftData.endTime.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrintReport}
            className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-semibold flex items-center gap-2 hover:border-primary transition-colors"
          >
            <Printer className="w-5 h-5" />
            Print Report
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportReport}
            className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
          >
            <Download className="w-5 h-5" />
            Export
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setClosingBalanceInput(expectedDrawer.toString());
              setShowClosingModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
          >
            <Clock className="w-5 h-5" />
            End Shift
          </motion.button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Total Sales</p>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {shiftData.totalOrders} orders
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Cash Sales</p>
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(shiftData.cashSales)}</p>
          <p className="text-xs text-gray-500 mt-2">Cash transactions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Card Sales</p>
            <CreditCard className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(shiftData.cardSales)}</p>
          <p className="text-xs text-gray-500 mt-2">Card transactions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-sm border border-green-200"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-green-700">Expected Drawer</p>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(expectedDrawer)}</p>
          <p className="text-xs text-green-600 mt-2">Including tips: {formatCurrency(actualDrawer)}</p>
        </motion.div>
      </div>

      {/* Cash Drawer Session Info */}
      {cashDrawer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Cash Drawer Session: {cashDrawer.sessionNumber}
                </p>
                <p className="text-xs text-blue-700">
                  Opened: {new Date(cashDrawer.openedAt).toLocaleTimeString()} by {cashDrawer.openedBy?.fullName || 'Unknown'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                {cashDrawer.status === 'open' ? 'Active' : 'Closed'}
              </span>
              <span className="text-sm text-blue-700">
                Txn: {cashDrawer.transactionCount}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Management */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Cash Management
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Opening Balance</span>
              {isEditingOpeningBalance ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                    placeholder="0.00"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const newBalance = parseFloat(openingBalanceInput) || 0;
                      setOpeningBalance(newBalance);
                      localStorage.setItem('pos_opening_balance', newBalance.toString());
                      setIsEditingOpeningBalance(false);
                      toast.success('Opening balance updated');
                    }}
                    className="px-2 py-1 bg-green-500 text-white rounded text-sm"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => {
                      setOpeningBalanceInput(openingBalance.toString());
                      setIsEditingOpeningBalance(false);
                    }}
                    className="px-2 py-1 bg-gray-400 text-white rounded text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setOpeningBalanceInput(openingBalance.toString());
                    setIsEditingOpeningBalance(true);
                  }}
                  className="font-bold text-gray-900 hover:text-primary flex items-center gap-1"
                  title="Click to edit"
                >
                  {formatCurrency(shiftData.openingBalance)}
                  <span className="text-xs text-gray-400">✎</span>
                </button>
              )}
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
              <span className="text-gray-600">+ Cash Sales</span>
              <span className="font-bold text-green-700">{formatCurrency(shiftData.cashSales)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
              <span className="text-gray-600">- Refunds</span>
              <span className="font-bold text-red-700">-{formatCurrency(shiftData.refunds)}</span>
            </div>
            <div className="border-t-2 border-gray-200 pt-3 flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Expected in Drawer</span>
              <span className="text-2xl font-black text-primary">{formatCurrency(expectedDrawer)}</span>
            </div>
          </div>
        </motion.div>

        {/* Order Statistics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Order Statistics
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Total Orders</span>
              <span className="font-bold text-gray-900 text-xl">{shiftData.totalOrders}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
              <span className="text-gray-600">Average Order Value</span>
              <span className="font-bold text-blue-700 text-xl">
                {formatCurrency(shiftData.totalOrders > 0 ? totalSales / shiftData.totalOrders : 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-xl">
              <span className="text-gray-600">Voided Orders</span>
              <span className="font-bold text-yellow-700 text-xl">{shiftData.voidedOrders}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
              <span className="text-gray-600">Tips Collected</span>
              <span className="font-bold text-purple-700 text-xl">{formatCurrency(shiftData.tips)}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* End Shift Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 flex justify-center"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setClosingBalanceInput(expectedDrawer.toString());
            setShowClosingModal(true);
          }}
          disabled={isEndingShift}
          className="px-12 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-3 disabled:opacity-50"
        >
          <Clock className="w-6 h-6" />
          {isEndingShift ? 'Ending...' : 'End Shift & Close Drawer'}
        </motion.button>
      </motion.div>

      {/* Closing Balance Modal */}
      {showClosingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-red-500" />
              Closing Balance
            </h3>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-600">Expected Drawer Amount:</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(expectedDrawer)}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Actual Cash in Drawer
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closingBalanceInput}
                  onChange={(e) => setClosingBalanceInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-xl font-bold text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              {closingBalanceInput && (
                <div className={`p-4 rounded-xl ${
                  Math.abs(parseFloat(closingBalanceInput) - expectedDrawer) < 0.01
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="text-sm font-semibold">
                    {Math.abs(parseFloat(closingBalanceInput) - expectedDrawer) < 0.01
                      ? '✓ Balanced'
                      : `⚠ Discrepancy: ${formatCurrency(parseFloat(closingBalanceInput) - expectedDrawer)}`}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Notes (optional)
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Any discrepancies or notes..."
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  rows={2}
                />
              </div>

              {/* Manager PIN Section */}
              {!showPinInput ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Manager approval required to end shift
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-amber-50 border border-amber-200 rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-900">Enter Manager PIN</p>
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    value={managerPin}
                    onChange={(e) => {
                      setManagerPin(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    placeholder="Enter PIN"
                    className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl text-center text-2xl font-bold tracking-widest focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    autoFocus
                  />
                  {pinError && (
                    <p className="text-red-600 text-sm mt-2 text-center">{pinError}</p>
                  )}
                </motion.div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowClosingModal(false);
                  setClosingNotes('');
                  setManagerPin('');
                  setPinError('');
                  setShowPinInput(false);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  if (isEndingShift) return;

                  // First step: show PIN input
                  if (!showPinInput) {
                    setShowPinInput(true);
                    return;
                  }

                  // Validate PIN
                  if (!managerPin || managerPin.length < 4) {
                    setPinError('Please enter a valid manager PIN');
                    return;
                  }

                  setIsEndingShift(true);
                  try {
                    // Validate manager PIN
                    const isValid = await validationService.validateManagerPin(
                      managerPin,
                      'end-shift'
                    );

                    if (!isValid) {
                      setPinError('Invalid manager PIN');
                      setManagerPin('');
                      setIsEndingShift(false);
                      return;
                    }

                    // Save closing balance to localStorage for record
                    localStorage.setItem('pos_closing_balance', closingBalanceInput);
                    localStorage.setItem('pos_closing_notes', closingNotes);
                    localStorage.setItem('pos_closing_time', new Date().toISOString());

                    // Close cash drawer if exists
                    const drawerId = cashDrawer?.id || localStorage.getItem('pos_cash_drawer_id');
                    if (drawerId) {
                      await cashDrawerService.close(drawerId, {
                        closingBalance: parseFloat(closingBalanceInput),
                        closingNotes: closingNotes || undefined,
                        expectedBalance: expectedDrawer,
                      });
                      
                      // Log cash drawer close
                      await logAction('CASH_DRAWER_CLOSE', 'CashDrawer', drawerId, {
                        closingBalance: parseFloat(closingBalanceInput),
                        expectedBalance: expectedDrawer,
                        discrepancy: parseFloat(closingBalanceInput) - expectedDrawer,
                        notes: closingNotes,
                      });
                      
                      // Clear cash drawer from localStorage
                      localStorage.removeItem('pos_cash_drawer_id');
                      localStorage.removeItem('pos_opening_balance');
                    }

                    if (user?.id) {
                      await staffService.clockInOut(user.id, 'clock-out');
                      // Log shift end
                      await logAction('SHIFT_END', 'StaffShift', user.id, {
                        closingBalance: parseFloat(closingBalanceInput),
                        expectedDrawer,
                      });
                    }
                    toast.success('Shift ended successfully!');
                    navigate('/dashboard');
                  } catch (error) {
                    console.error('Failed to end shift:', error);
                    toast.error('Failed to end shift');
                  } finally {
                    setIsEndingShift(false);
                    setShowClosingModal(false);
                    setManagerPin('');
                    setShowPinInput(false);
                  }
                }}
                disabled={isEndingShift || !closingBalanceInput}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isEndingShift ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : showPinInput ? (
                  <>
                    <Shield className="w-5 h-5" />
                    Confirm & End Shift
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    Request Approval
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ShiftSummary;
