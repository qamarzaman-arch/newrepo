import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CreditCard, Banknote, Smartphone,
  SplitSquareHorizontal, CheckCircle, ChevronRight,
  Shield, Calculator, Plus, Trash2, Heart,
  Zap, ArrowRight, Loader2, Landmark, Wallet
} from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCurrencyFormatter } from '../../hooks/useCurrency';
import { orderService } from '../../services/orderService';
import { validationService } from '../../services/validationService';
import toast from 'react-hot-toast';

interface Props {
  onBack: () => void;
  onSuccess: (orderData: any, change: number) => void;
}

const CheckoutPayment: React.FC<Props> = ({ onBack, onSuccess }) => {
  const { currentOrder, getSubtotal, getTax, getServiceCharge, getTotal, setOrderNumber } = useOrderStore();
  const { settings } = useSettingsStore();
  const { formatCurrency } = useCurrencyFormatter();

  const [selectedMethod, setSelectedMethod] = useState<string>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManagerPin, setShowManagerPin] = useState(false);

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();
  const change = Math.max(0, (parseFloat(cashReceived) || 0) - total);

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      // 1. Create Order
      const orderData = {
        orderType: currentOrder.orderType,
        tableId: currentOrder.tableId,
        customerId: currentOrder.customerId,
        customerName: currentOrder.customerName,
        customerPhone: currentOrder.customerPhone,
        items: currentOrder.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes
        })),
        notes: currentOrder.notes,
        subtotal,
        taxAmount: tax,
        totalAmount: total
      };

      const response = await orderService.createOrder(orderData as any);
      const createdOrder = response.data.data.order;

      // 2. Process Payment
      await orderService.processPayment(createdOrder.id, {
        method: selectedMethod,
        amount: total,
        reference: `PAY-${Date.now()}`
      });

      toast.success('Transaction synchronized');
      onSuccess(createdOrder, change);
    } catch (error) {
      toast.error('Financial settlement failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const methods = [
    { id: 'CASH', label: 'Cash Entry', icon: Banknote, color: 'bg-emerald-600' },
    { id: 'CARD', label: 'External Card', icon: CreditCard, color: 'bg-blue-600' },
    { id: 'MOBILE', label: 'Digital Wallet', icon: Smartphone, color: 'bg-purple-600' },
    { id: 'CREDIT', label: 'Line of Credit', icon: Landmark, color: 'bg-gray-800' },
  ];

  return (
    <div className="h-full flex bg-gray-50 overflow-hidden">
      {/* LEFT: Ledger Review */}
      <div className="flex-1 p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-10">
           <div className="flex items-center gap-6">
              <button onClick={onBack} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">
                 <ArrowLeft className="w-6 h-6 text-gray-400" />
              </button>
              <div>
                 <h2 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Settlement</h2>
                 <p className="text-gray-500 font-medium italic">Fulfilling order #{currentOrder.orderNumber || 'PENDING'}</p>
              </div>
           </div>

           <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Financial Manifest</h3>
              <div className="space-y-4">
                 {currentOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-2">
                       <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center font-black text-xs border border-gray-100">{item.quantity}</span>
                          <p className="font-bold text-gray-700">{item.name}</p>
                       </div>
                       <p className="font-black text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                 ))}
              </div>
              <div className="mt-8 pt-8 border-t-4 border-dashed border-gray-50 space-y-3">
                 <div className="flex justify-between text-gray-400 font-bold uppercase text-xs tracking-widest">
                    <span>Gross Yield</span>
                    <span>{formatCurrency(subtotal)}</span>
                 </div>
                 <div className="flex justify-between text-gray-400 font-bold uppercase text-xs tracking-widest">
                    <span>VAT (Included)</span>
                    <span>{formatCurrency(tax)}</span>
                 </div>
                 <div className="flex justify-between items-center pt-4">
                    <span className="text-xl font-black uppercase tracking-tighter text-gray-900">Total Obligation</span>
                    <span className="text-5xl font-black text-primary tracking-tighter">{formatCurrency(total)}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* RIGHT: Payment Logic */}
      <div className="w-[500px] bg-white border-l border-gray-100 p-12 flex flex-col shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.05)]">
         <h3 className="text-2xl font-black text-gray-900 mb-10 uppercase tracking-tight">Payment Gateway</h3>

         <div className="grid grid-cols-2 gap-4 mb-10">
            {methods.map(m => (
               <button
                 key={m.id}
                 onClick={() => setSelectedMethod(m.id)}
                 className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-3 ${selectedMethod === m.id ? 'border-primary bg-primary/5 shadow-xl' : 'border-gray-50 bg-gray-50 hover:bg-white hover:border-gray-200'}`}
               >
                  <div className={`w-12 h-12 ${selectedMethod === m.id ? 'bg-primary text-white' : 'bg-white text-gray-400'} rounded-2xl flex items-center justify-center shadow-lg transition-all`}>
                     <m.icon className="w-6 h-6" />
                  </div>
                  <span className="font-black uppercase text-[10px] tracking-widest">{m.label}</span>
               </button>
            ))}
         </div>

         {selectedMethod === 'CASH' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 flex-1">
               <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Tender Received</p>
                  <div className="flex items-center gap-4">
                     <span className="text-4xl font-black text-primary">$</span>
                     <input
                       type="number"
                       value={cashReceived}
                       onChange={(e) => setCashReceived(e.target.value)}
                       placeholder="0.00"
                       className="bg-transparent border-none outline-none text-5xl font-black w-full placeholder:text-white/10"
                       autoFocus
                     />
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-3">
                  {[10, 20, 50, 100].map(val => (
                    <button key={val} onClick={() => setCashReceived(String(val))} className="py-4 bg-gray-100 rounded-2xl font-black text-gray-900 hover:bg-gray-200 transition-all border border-gray-200">${val}</button>
                  ))}
                  <button onClick={() => setCashReceived(String(total))} className="col-span-2 py-4 bg-primary/10 text-primary rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/20 transition-all border border-primary/20">Exact Change</button>
               </div>

               <div className="p-8 bg-green-50 rounded-[2.5rem] border-2 border-green-100 flex justify-between items-center mt-auto">
                  <div>
                     <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Return to Client</p>
                     <p className="text-4xl font-black text-green-700">{formatCurrency(change)}</p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-green-600/20" />
               </div>
            </motion.div>
         )}

         {selectedMethod !== 'CASH' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border-4 border-dashed border-gray-100 rounded-[3rem] opacity-40">
               <Shield className="w-16 h-16 mb-4 text-gray-300" />
               <p className="font-black uppercase text-sm tracking-tight text-gray-400">Terminal Integration Staged</p>
               <p className="text-xs italic text-gray-400 mt-2">Waiting for external hardware handshake via POSLytic Link...</p>
            </div>
         )}

         <button
           onClick={handleCheckout}
           disabled={isProcessing || (selectedMethod === 'CASH' && (parseFloat(cashReceived) || 0) < total)}
           className="w-full py-6 bg-gray-950 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mt-8 disabled:opacity-50"
         >
            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 text-primary" />}
            {isProcessing ? 'Finalizing...' : 'Authorize Transaction'}
         </button>
      </div>
    </div>
  );
};

export default CheckoutPayment;
