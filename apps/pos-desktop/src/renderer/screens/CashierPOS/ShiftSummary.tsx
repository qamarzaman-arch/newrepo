import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, DollarSign, ShoppingCart, TrendingUp, 
  ArrowLeft, Printer, Download, CheckCircle,
  CreditCard
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { staffService } from '@/services/staffService';
import { reportService } from '@/services/reportService';
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

  // In a full production system, this would fetch specific shift ID data
  // For now, we use the real daily sales report to simulate the current cumulative shift
  const { data: dailySales } = useQuery({
    queryKey: ['shift-summary'],
    queryFn: async () => {
      const response = await reportService.getDailySales();
      return response.data.data;
    },
  });

  const shiftData = {
    startTime: shiftStartTime,
    endTime: new Date(),
    cashierName: user?.fullName || 'Cashier',
    openingBalance,
    cashSales: dailySales?.paymentMethodBreakdown?.CASH || 0,
    cardSales: (dailySales?.paymentMethodBreakdown?.CARD || 0) + (dailySales?.paymentMethodBreakdown?.CREDIT || 0),
    totalOrders: dailySales?.totalOrders || 0,
    voidedOrders: dailySales?.voidedOrders || 0,
    refunds: dailySales?.refunds || 0,
    tips: dailySales?.tips || 0,
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
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowClosingModal(false);
                  setClosingNotes('');
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
                  setIsEndingShift(true);
                  try {
                    // Save closing balance to localStorage for record
                    localStorage.setItem('pos_closing_balance', closingBalanceInput);
                    localStorage.setItem('pos_closing_notes', closingNotes);
                    localStorage.setItem('pos_closing_time', new Date().toISOString());

                    if (user?.id) {
                      await staffService.clockInOut(user.id, 'clock-out');
                    }
                    toast.success('Shift ended successfully!');
                    navigate('/dashboard');
                  } catch (error) {
                    console.error('Failed to end shift:', error);
                    toast.error('Failed to end shift');
                  } finally {
                    setIsEndingShift(false);
                    setShowClosingModal(false);
                  }
                }}
                disabled={isEndingShift || !closingBalanceInput}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isEndingShift ? 'Ending...' : 'Confirm & End Shift'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ShiftSummary;
