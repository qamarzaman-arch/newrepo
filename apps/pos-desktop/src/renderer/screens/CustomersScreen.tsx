import React, { useState } from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { customerService } from '../services/customerService';
import { Search, Plus, UserCircle, History } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomersScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data: customersData, refetch } = useCustomers({
    search: searchQuery || undefined,
    page,
    limit: 20,
  });

  const customers = customersData?.customers || [];
  const pagination = customersData?.pagination || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <button className="px-4 py-2 gradient-btn rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-surface-lowest rounded-2xl shadow-soft overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Loyalty Points</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Orders</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Total Spent</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers.map((customer: any) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900">{customer.firstName} {customer.lastName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.email || '-'}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    {customer.loyaltyPoints} pts
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.totalOrders}</td>
                <td className="px-6 py-4 font-bold text-primary">${customer.totalSpent.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <button className="p-2 hover:bg-blue-100 rounded-lg transition-colors">
                    <History className="w-4 h-4 text-blue-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {customers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No customers found</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">Page {page} of {pagination.totalPages}</p>
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
    </div>
  );
};

export default CustomersScreen;
