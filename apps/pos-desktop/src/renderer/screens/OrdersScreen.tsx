import React, { useState } from 'react';
import { useOrders, useOrder } from '../hooks/useOrders';
import { orderService } from '../services/orderService';
import { Search, Eye, Printer, XCircle, Edit2, Trash2, Plus } from 'lucide-react';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const OrdersScreen: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [page, setPage] = useState(1);
  const { formatCurrency } = useCurrencyFormatter();
  const { user } = useAuthStore();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [orderForm, setOrderForm] = useState({
    orderType: 'DINE_IN' as const,
    customerName: '',
    customerPhone: '',
    tableId: '',
    notes: '',
  });

  const { data: ordersData, refetch } = useOrders({
    status: statusFilter || undefined,
    page,
    limit: 20,
  });

  const { data: selectedOrderData } = useOrder(selectedOrder || '');

  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination || {};

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await orderService.updateStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orderData = {
        ...orderForm,
        items: [], // Empty items for now, user can add items later
      };
      await orderService.createOrder(orderData);
      toast.success('Order created successfully');
      setShowOrderModal(false);
      setOrderForm({
        orderType: 'DINE_IN',
        customerName: '',
        customerPhone: '',
        tableId: '',
        notes: '',
      });
      refetch();
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error('Failed to create order');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }
    try {
      await orderService.deleteOrder(orderId);
      toast.success('Order deleted successfully');
      refetch();
    } catch (error) {
      console.error('Failed to delete order:', error);
      toast.error('Failed to delete order');
    }
  };

  const filteredOrders = orders.filter((order: any) => {
    if (!searchQuery) return true;
    return (
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PREPARING: 'bg-purple-100 text-purple-800',
      READY: 'bg-green-100 text-green-800',
      SERVED: 'bg-indigo-100 text-indigo-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <button
          onClick={() => setShowOrderModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Order
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface-lowest rounded-2xl p-4 shadow-soft">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by order number or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-surface-lowest rounded-2xl shadow-soft overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Order #</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Payment</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOrders.map((order: any) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-900">{order.orderNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.orderType}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.items?.length || 0} items</td>
                <td className="px-6 py-4 font-bold text-primary">{formatCurrency(order.totalAmount)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.paymentStatus}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(order.orderedAt).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedOrder(order.id)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                    {isAdminOrManager && (
                      <>
                        <button
                          onClick={() => {
                            setOrderForm({
                              orderType: order.orderType,
                              customerName: order.customerName || '',
                              customerPhone: order.customerPhone || '',
                              tableId: order.tableId || '',
                              notes: order.notes || '',
                            });
                            setShowOrderModal(true);
                          }}
                          className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                          title="Edit Order"
                        >
                          <Edit2 className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </>
                    )}
                    {order.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'CONFIRMED')}
                          className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                          title="Confirm"
                        >
                          <Printer className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <XCircle className="w-4 h-4 text-red-600" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No orders found</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page {page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-lowest rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Create Order</h2>
              <button onClick={() => setShowOrderModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Order Type</label>
                <select
                  value={orderForm.orderType}
                  onChange={(e) => setOrderForm({ ...orderForm, orderType: e.target.value as any })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                >
                  <option value="DINE_IN">Dine In</option>
                  <option value="TAKEAWAY">Takeaway</option>
                  <option value="DELIVERY">Delivery</option>
                  <option value="PICKUP">Pickup</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Phone</label>
                <input
                  type="tel"
                  value={orderForm.customerPhone}
                  onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  placeholder="Enter customer phone"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  rows={3}
                  placeholder="Enter order notes"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-lowest rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="font-bold">{selectedOrderData?.orderNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedOrderData?.status || '')}`}>
                    {selectedOrderData?.status || 'N/A'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-semibold">{selectedOrderData?.orderType || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-bold text-primary">{selectedOrderData ? formatCurrency(selectedOrderData.totalAmount) : formatCurrency(0)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-2">Items</h3>
                <div className="space-y-2">
                  {selectedOrderData?.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold">{item.menuItem?.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-bold">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersScreen;
