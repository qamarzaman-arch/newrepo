import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { tableService } from '../services/tableService';
import { Users } from 'lucide-react';

const TablesScreen: React.FC = () => {
  const { data: tablesData, refetch } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const response = await tableService.getTables();
      return response.data.data.tables;
    },
  });

  const tables = tablesData || [];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      AVAILABLE: 'bg-green-500',
      OCCUPIED: 'bg-red-500',
      RESERVED: 'bg-yellow-500',
      NEEDS_CLEANING: 'bg-orange-500',
      OUT_OF_ORDER: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const handleStatusChange = async (tableId: string, newStatus: string) => {
    await tableService.updateStatus(tableId, newStatus as any);
    refetch();
  };

  const stats = {
    available: tables.filter((t: any) => t.status === 'AVAILABLE').length,
    occupied: tables.filter((t: any) => t.status === 'OCCUPIED').length,
    reserved: tables.filter((t: any) => t.status === 'RESERVED').length,
    needsCleaning: tables.filter((t: any) => t.status === 'NEEDS_CLEANING').length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Table Management</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-100 rounded-xl p-4">
          <p className="text-sm text-green-800">Available</p>
          <p className="text-2xl font-bold text-green-900">{stats.available}</p>
        </div>
        <div className="bg-red-100 rounded-xl p-4">
          <p className="text-sm text-red-800">Occupied</p>
          <p className="text-2xl font-bold text-red-900">{stats.occupied}</p>
        </div>
        <div className="bg-yellow-100 rounded-xl p-4">
          <p className="text-sm text-yellow-800">Reserved</p>
          <p className="text-2xl font-bold text-yellow-900">{stats.reserved}</p>
        </div>
        <div className="bg-orange-100 rounded-xl p-4">
          <p className="text-sm text-orange-800">Needs Cleaning</p>
          <p className="text-2xl font-bold text-orange-900">{stats.needsCleaning}</p>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {tables.map((table: any) => (
          <div
            key={table.id}
            className="bg-surface-lowest rounded-2xl p-6 shadow-soft cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => {
              if (table.status === 'OCCUPIED') {
                handleStatusChange(table.id, 'NEEDS_CLEANING');
              } else if (table.status === 'NEEDS_CLEANING') {
                handleStatusChange(table.id, 'AVAILABLE');
              }
            }}
          >
            <div className={`w-4 h-4 rounded-full ${getStatusColor(table.status)} mx-auto mb-3`}></div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Table {table.number}</h3>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
              <Users className="w-4 h-4" />
              <span>{table.capacity}</span>
            </div>
            <p className="text-xs text-center text-gray-500">{table.location}</p>
            <p className="text-xs text-center text-gray-400 mt-2 capitalize">{table.status.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No tables configured yet</p>
        </div>
      )}
    </div>
  );
};

export default TablesScreen;
