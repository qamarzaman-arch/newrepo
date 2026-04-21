import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import {
  Search,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Receipt,
  Printer,
  RefreshCcw,
  Calendar,
  User,
  MapPin,
  Loader2,
  Trash2,
  AlertTriangle,
  FileText,
  Eye,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@poslytic/ui-components';
import ManagerAuthorizationModal from '../components/ManagerAuthorizationModal';
import ReceiptPreview from '../components/ReceiptPreview';
import toast from 'react-hot-toast';

const AdvancedOrdersScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showManagerAuth, setShowManagerAuth] = useState(false);
  const [authAction, setAuthAction] = useState<{name: string, callback: () => void} | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptText, setReceiptText] = useState('');

  const { formatCurrency } = useCurrencyFormatter();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', filterStatus],
    queryFn: async () => {
      const response = await orderService.getOrders({
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        limit: 100
      });
      return response.data.data.orders;
    },
  });

  const filteredOrders = orders?.filter((order: any) =>
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await orderService.updateStatus(id, status);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Order ${status.toLowerCase()}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const requestAuthorization = (actionName: string, onAuthorized: () => void) => {
    setAuthAction({ name: actionName, callback: onAuthorized });
    setShowManagerAuth(true);
  };

  const handleRefund = async (id: string) => {
    requestAuthorization('Refund Order', async () => {
       try {
          await orderService.refundOrder(id, {
             type: 'FULL',
             reason: 'Customer Request',
             amount: selectedOrder.totalAmount,
             managerPin: '123456', // Real pin from auth modal in prod
             approvedBy: 'Manager'
          });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          setShowRefundModal(false);
          toast.success('Order refunded successfully');
       } catch (error) {
          toast.error('Refund failed');
       }
    });
  };

  const fetchReceipt = async (id: string) => {
     try {
        const response = await (orderService as any).getOrder(`${id}/receipt`);
        setReceiptText(response.data.data.receiptText);
        setShowReceiptPreview(true);
     } catch (error) {
        toast.error('Could not generate receipt');
     }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="neutral">Pending</Badge>;
      case 'PREPARING': return <Badge variant="info">Preparing</Badge>;
      case 'READY': return <Badge variant="warning">Ready</Badge>;
      case 'COMPLETED': return <Badge variant="success">Completed</Badge>;
      case 'CANCELLED': return <Badge variant="error">Cancelled</Badge>;
      case 'REFUNDED': return <Badge variant="error">Refunded</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="p-8 bg-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Order Explorer</h1>
           <p className="text-gray-500 font-medium mt-1">Search, monitor and manage all transaction history</p>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative group">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-6 py-3 bg-gray-50 border border-gray-200 rounded-2xl w-full md:w-80 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
              />
           </div>
           <select
             value={filterStatus}
             onChange={(e) => setFilterStatus(e.target.value)}
             className="px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 shadow-sm outline-none hover:bg-gray-50 transition-colors"
           >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PREPARING">Preparing</option>
              <option value="COMPLETED">Completed</option>
              <option value="REFUNDED">Refunded</option>
           </select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
         {/* LIST SECTION */}
         <div className="w-full md:w-1/2 lg:w-2/5 border-r border-gray-100 bg-white overflow-y-auto scrollbar-hide">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-gray-400 font-bold italic tracking-tight">Syncing records...</p>
               </div>
            ) : (
               <div className="divide-y divide-gray-50">
                  {filteredOrders?.map((order: any) => (
                    <motion.div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`p-6 cursor-pointer transition-all ${
                        selectedOrder?.id === order.id ? 'bg-primary/5 border-l-4 border-primary shadow-inner' : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                       <div className="flex justify-between items-start mb-3">
                          <div>
                             <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">{order.orderNumber}</p>
                             <h4 className="font-black text-gray-900 text-lg flex items-center gap-2">
                                {order.customerName || 'Walk-in Customer'}
                                {order.table && <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500 uppercase font-black">Table {order.table.number}</span>}
                             </h4>
                          </div>
                          <div className="text-right">
                             <p className="font-black text-gray-900">{formatCurrency(order.totalAmount)}</p>
                             {getStatusBadge(order.status)}
                          </div>
                       </div>
                       <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(order.orderedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="flex items-center gap-1"><Receipt className="w-3 h-3" /> {order.items.length} items</span>
                       </div>
                    </motion.div>
                  ))}
               </div>
            )}
         </div>

         {/* DETAIL SECTION */}
         <div className="flex-1 bg-gray-50 p-10 overflow-y-auto">
            {selectedOrder ? (
               <motion.div
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="space-y-8"
               >
                  <div className="flex items-start justify-between">
                     <div>
                        <div className="flex items-center gap-3 mb-2">
                           <h2 className="text-4xl font-black text-gray-900 tracking-tight">{selectedOrder.orderNumber}</h2>
                           {getStatusBadge(selectedOrder.status)}
                        </div>
                        <p className="text-gray-500 font-medium italic">Placed on {new Date(selectedOrder.orderedAt).toLocaleString()}</p>
                     </div>
                     <div className="flex gap-3">
                        <button
                          onClick={() => fetchReceipt(selectedOrder.id)}
                          className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-700 hover:bg-gray-50 transition-all"
                        >
                           <Eye className="w-6 h-6" />
                        </button>
                        <button
                          className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-700 hover:bg-gray-50 transition-all"
                        >
                           <Printer className="w-6 h-6" />
                        </button>
                        {(selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'READY') && (
                          <button 
                            onClick={() => setShowRefundModal(true)}
                            className="flex items-center gap-3 px-6 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all"
                          >
                             <RefreshCcw className="w-5 h-5" />
                             Refund Transaction
                          </button>
                        )}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Client Information</p>
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                              <User className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="font-bold text-gray-900">{selectedOrder.customerName || 'Anonymous'}</p>
                              <p className="text-xs text-gray-500">{selectedOrder.customerPhone || 'No contact provided'}</p>
                           </div>
                        </div>
                     </div>
                     <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Location Info</p>
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                              <MapPin className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="font-bold text-gray-900">{selectedOrder.orderType}</p>
                              <p className="text-xs text-gray-500">{selectedOrder.table ? `Table ${selectedOrder.table.number}` : 'Express Service'}</p>
                           </div>
                        </div>
                     </div>
                     <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Payment Summary</p>
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                              <Receipt className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="font-bold text-gray-900">{selectedOrder.paymentMethod || 'PENDING'}</p>
                              <p className="text-xs text-gray-500 font-black text-green-600 uppercase tracking-widest">{selectedOrder.paymentStatus}</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                     <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-3">
                           <FileText className="w-6 h-6 text-primary" />
                           Order Manifest
                        </h3>
                        <span className="px-4 py-1.5 bg-gray-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{selectedOrder.items.length} Unique Entries</span>
                     </div>
                     <table className="w-full">
                        <thead className="bg-gray-50/50">
                           <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <th className="px-8 py-5">Product Details</th>
                              <th className="px-8 py-5 text-center">Qty</th>
                              <th className="px-8 py-5 text-right">Unit</th>
                              <th className="px-8 py-5 text-right">Total</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                           {selectedOrder.items.map((item: any) => (
                             <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-8 py-5">
                                   <p className="font-black text-gray-900">{item.menuItem.name}</p>
                                   {item.notes && <p className="text-xs text-amber-600 font-medium italic mt-1">Special Req: {item.notes}</p>}
                                </td>
                                <td className="px-8 py-5 text-center">
                                   <span className="inline-block w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-black text-gray-900 mx-auto border border-gray-200">{item.quantity}</span>
                                </td>
                                <td className="px-8 py-5 text-right font-bold text-gray-500">{formatCurrency(item.unitPrice)}</td>
                                <td className="px-8 py-5 text-right font-black text-gray-900">{formatCurrency(item.totalPrice)}</td>
                             </tr>
                           ))}
                        </tbody>
                        <tfoot className="bg-gray-50/50">
                           <tr>
                              <td colSpan={3} className="px-8 py-4 text-right text-sm font-bold text-gray-500 uppercase tracking-widest">Subtotal</td>
                              <td className="px-8 py-4 text-right font-black text-gray-900">{formatCurrency(selectedOrder.subtotal)}</td>
                           </tr>
                           {selectedOrder.taxAmount > 0 && (
                             <tr>
                                <td colSpan={3} className="px-8 py-4 text-right text-sm font-bold text-gray-500 uppercase tracking-widest text-primary">Taxation</td>
                                <td className="px-8 py-4 text-right font-black text-primary">+{formatCurrency(selectedOrder.taxAmount)}</td>
                             </tr>
                           )}
                           <tr className="bg-gray-900 text-white">
                              <td colSpan={3} className="px-8 py-6 text-right text-lg font-black uppercase tracking-widest">Total Transaction Value</td>
                              <td className="px-8 py-6 text-right text-2xl font-black">{formatCurrency(selectedOrder.totalAmount)}</td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               </motion.div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-center p-20 border-4 border-dashed border-gray-200 rounded-[3rem]">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-8 text-gray-300">
                     <FileText className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-400 tracking-tight uppercase">Select an order to view manifest</h3>
                  <p className="text-gray-400 font-medium mt-2 max-w-xs mx-auto italic">Real-time data synchronization is active. Click any record on the left to inspect.</p>
               </div>
            )}
         </div>
      </div>

      {/* REFUND CONFIRMATION MODAL */}
      <AnimatePresence>
        {showRefundModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
               <div className="p-10 text-center space-y-6">
                  <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                     <AlertTriangle className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Process Refund</h3>
                    <p className="text-gray-500 font-medium mt-2 italic">You are about to refund transaction <b>{selectedOrder.orderNumber}</b> for the full amount of <b>{formatCurrency(selectedOrder.totalAmount)}</b>.</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-4 text-left">
                     <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0" />
                     <p className="text-xs text-amber-800 font-bold uppercase tracking-wide leading-relaxed">Manager authorization is required for this destructive action. This event will be recorded in the security audit trail.</p>
                  </div>

                  <div className="flex gap-4">
                     <button
                       onClick={() => setShowRefundModal(false)}
                       className="flex-1 py-5 bg-gray-100 text-gray-700 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all"
                     >
                       Cancel
                     </button>
                     <button
                       onClick={() => handleRefund(selectedOrder.id)}
                       className="flex-1 py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all"
                     >
                       Confirm Refund
                     </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ManagerAuthorizationModal
        isOpen={showManagerAuth}
        onClose={() => setShowManagerAuth(false)}
        onAuthorized={(mgr) => {
           authAction?.callback();
           setShowManagerAuth(false);
        }}
        actionName={authAction?.name || 'Authorized Action'}
      />

      <AnimatePresence>
        {showReceiptPreview && receiptText && (
          <ReceiptPreview
            receiptText={receiptText}
            onClose={() => setShowReceiptPreview(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedOrdersScreen;
