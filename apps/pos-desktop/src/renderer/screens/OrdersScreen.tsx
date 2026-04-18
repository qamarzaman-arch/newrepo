import React, { useState } from 'react';
import { useOrders, useOrder } from '../hooks/useOrders';
import { orderService } from '../services/orderService';
import { Search, Eye, Printer, XCircle } from 'lucide-react';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

const OrdersScreen: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { formatCurrency } = useCurrencyFormatter();

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
