import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Printer, Receipt, FileText, Smartphone, Mail, ArrowRight, Star, ExternalLink, Eye } from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCurrencyFormatter } from '../../hooks/useCurrency';
import { getHardwareManager } from '../../services/hardwareManager';
import { orderService } from '../../services/orderService';
import ReceiptPreview from '../../components/ReceiptPreview';
import toast from 'react-hot-toast';

interface OrderSuccessProps {
  receiptData: {
    orderId?: string;
    orderNumber: string;
    total: number;
    items: any[];
    orderType: string;
    tableNumber?: string;
    customerName?: string;
  };
  change?: number;
  onNewOrder: () => void;
}

const OrderSuccess: React.FC<OrderSuccessProps> = ({ receiptData, change = 0, onNewOrder }) => {
  const { clearOrder } = useOrderStore();
  const { settings } = useSettingsStore();
  const { formatCurrency } = useCurrencyFormatter();
  const [isPrinting, setIsPrinting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [receiptText, setReceiptText] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const timestamp = new Date().toLocaleString();

  useEffect(() => {
    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const fetchReceipt = async () => {
    if (!receiptData.orderId) return;
    try {
      const response = await orderService.getOrder(receiptData.orderId + '/receipt');
      if (response.data.success) {
        setReceiptText(response.data.data.receiptText);
        setShowPreview(true);
      }
    } catch (error) {
      toast.error('Failed to generate formatted receipt');
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const hw = getHardwareManager();
      await hw.printReceipt({
        restaurantName: settings.restaurantName || 'POSLytic Restaurant',
        restaurantAddress: settings.address || '',
        restaurantPhone: settings.phone || '',
        orderNumber: receiptData.orderNumber,
        cashierName: 'Cashier',
        items: receiptData.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        })),
        subtotal: receiptData.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        tax: 0,
        taxRate: settings.taxRate || 8.5,
        discount: 0,
        total: receiptData.total,
        paymentMethod: 'CASH',
        change: change,
      });
      toast.success('Receipt sent to printer');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Printer not available');
    } finally {
      setIsPrinting(false);
    }
  };

  const currencyCode = settings.currency || 'USD';

  return (
    <div className="flex h-full overflow-y-auto bg-gray-50 relative overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center py-12 px-8 z-10">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="w-24 h-24 rounded-3xl bg-green-500 flex items-center justify-center mb-8 shadow-xl shadow-green-500/20"
        >
          <Check className="w-12 h-12 text-white" strokeWidth={4} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-500 font-medium italic">Order #{receiptData.orderNumber} is now being processed</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
           {/* LEFT: Summary & Change */}
           <motion.div
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.4 }}
             className="space-y-6"
           >
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                 <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Amount Due</p>
                 <p className="text-4xl font-black text-gray-900 mb-6">{formatCurrency(receiptData.total, currencyCode)}</p>

                 <div className="p-6 bg-green-50 rounded-2xl border-2 border-green-100">
                    <p className="text-sm font-bold text-green-600 uppercase tracking-widest mb-1">Change to Return</p>
                    <p className="text-5xl font-black text-green-700">{formatCurrency(change, currencyCode)}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button className="flex flex-col items-center gap-3 p-6 bg-white rounded-3xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all group">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><Mail className="w-6 h-6" /></div>
                    <span className="text-sm font-bold text-gray-700">Email Receipt</span>
                 </button>
                 <button className="flex flex-col items-center gap-3 p-6 bg-white rounded-3xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all group">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform"><Smartphone className="w-6 h-6" /></div>
                    <span className="text-sm font-bold text-gray-700">SMS Receipt</span>
                 </button>
              </div>
           </motion.div>

           {/* RIGHT: Actions & Receipt */}
           <motion.div
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.4 }}
             className="space-y-6"
           >
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                 <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    Receipt Actions
                 </h3>

                 <div className="space-y-3">
                    <button
                      onClick={handlePrint}
                      disabled={isPrinting}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                    >
                      {isPrinting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                      {isPrinting ? 'Printing...' : 'Print Paper Receipt'}
                    </button>

                    <button
                      onClick={fetchReceipt}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-gray-800 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      Preview Digital Receipt
                    </button>
                 </div>
              </div>

              <button
                onClick={() => { clearOrder(); onNewOrder(); }}
                className="w-full py-6 bg-gradient-to-r from-gray-900 to-black text-white rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] transition-all group"
              >
                Start New Transaction
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
           </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showPreview && receiptText && (
          <ReceiptPreview
            receiptText={receiptText}
            onClose={() => setShowPreview(false)}
            onPrint={handlePrint}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderSuccess;
