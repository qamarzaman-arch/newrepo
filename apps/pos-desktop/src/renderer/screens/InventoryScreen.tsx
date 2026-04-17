import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '../services/inventoryService';
import { AlertTriangle, Package } from 'lucide-react';
import { useCurrencyFormatter } from '../hooks/useCurrency';

const InventoryScreen: React.FC = () => {
  const { formatCurrency } = useCurrencyFormatter();
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await inventoryService.getInventory();
      return response.data.data.items;
    },
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const response = await inventoryService.getLowStock();
      return response.data.data.items;
    },
  });

  const items = inventoryData || [];
  const lowStockItems = lowStockData || [];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      IN_STOCK: 'bg-green-100 text-green-800',
      LOW_STOCK: 'bg-yellow-100 text-yellow-800',
      OUT_OF_STOCK: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="font-bold text-yellow-900">Low Stock Alert</h3>
              <p className="text-sm text-yellow-700">
                {lowStockItems.length} item(s) are running low on stock
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-sm text-gray-600">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-900">{lowStockItems.length}</p>
        </div>
        <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm text-gray-600">Out of Stock</p>
          <p className="text-2xl font-bold text-red-900">
            {items.filter((i: any) => i.status === 'OUT_OF_STOCK').length}
          </p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-surface-lowest rounded-2xl shadow-soft overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Item Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Current Stock</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Min Stock</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Cost/Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.sku || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.category || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`font-bold ${
                    item.currentStock <= item.minStock ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {item.currentStock} {item.unit}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.minStock} {item.unit}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.costPerUnit)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No inventory items found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryScreen;
