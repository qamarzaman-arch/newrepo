import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Users,
} from 'lucide-react';
import { useTables } from '../../hooks/useTables';

interface TableCustomerSelectionProps {
  orderType: string;
  selectedTableId?: string | null;
  onSelect: (data: { tableId?: string; customerName?: string; customerPhone?: string; guestCount?: number }) => void;
  onBack: () => void;
}

const TableCustomerSelection: React.FC<TableCustomerSelectionProps> = ({
  orderType,
  selectedTableId,
  onSelect,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [localTableId, setLocalTableId] = useState<string | null>(selectedTableId || null);

  const { data: tables } = useTables({ isActive: true });

  const availableTables = tables?.filter((t: any) => t.status === 'AVAILABLE') || [];
  const occupiedTables = tables?.filter((t: any) => t.status === 'OCCUPIED') || [];

  const handleProceed = () => {
    if (orderType === 'DINE_IN' && !localTableId) {
      return; // Must select table for dine-in
    }

    onSelect({
      tableId: localTableId || undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      guestCount,
    });
  };

  // For Walk-In and Takeaway, skip this screen
  if (orderType === 'WALK_IN' || orderType === 'TAKEAWAY') {
    onSelect({});
    return null;
  }

  return (
    <div className="flex h-screen pt-20 bg-gray-50">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <h1 className="font-manrope text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
                {orderType === 'DINE_IN' ? 'Select Table' : 'Customer Information'}
              </h1>
              <p className="text-gray-600 font-inter text-lg">
                {orderType === 'DINE_IN'
                  ? 'Main Dining Room & Floor Plan'
                  : orderType === 'DELIVERY'
                  ? 'Enter delivery customer details'
                  : ''}
              </p>
            </div>

            {orderType === 'DINE_IN' && (
              <div className="flex gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-xs font-inter uppercase tracking-widest text-gray-600">
                    Available
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="text-xs font-inter uppercase tracking-widest text-gray-600">
                    Occupied
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Dine-In: Table Grid */}
          {orderType === 'DINE_IN' && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
              {availableTables.map((table: any, index: number) => (
                <motion.button
                  key={table.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLocalTableId(table.id)}
                  className={`group aspect-square bg-white rounded-[2rem] p-6 flex flex-col justify-between items-center transition-all hover:bg-primary/5 active:scale-95 border-2 border-gray-200 hover:border-primary shadow-md ${
                    localTableId === table.id ? 'border-primary bg-primary/10' : ''
                  }`}
                >
                  <span className="text-primary font-manrope text-xl font-bold self-start">
                    {table.number}
                  </span>
                  <Users className="text-primary w-12 h-12" />
                  <div className="bg-primary/20 text-primary px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                    Available
                  </div>
                </motion.button>
              ))}

              {occupiedTables.map((table: any) => (
                <div
                  key={table.id}
                  className="group aspect-square bg-gray-100 rounded-[2rem] p-6 flex flex-col justify-between items-center transition-all opacity-75 relative overflow-hidden border-2 border-gray-200"
                >
                  <div className="absolute inset-0 bg-red-100/30" />
                  <span className="text-red-500 font-manrope text-xl font-bold self-start">
                    {table.number}
                  </span>
                  <Users className="text-red-500 w-12 h-12" style={{ fill: 'currentColor' }} />
                  <div className="bg-red-100 text-red-600 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                    Occupied
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Customer Information Form (for Delivery or optional for Dine-In) */}
          {(orderType === 'DELIVERY' || orderType === 'DINE_IN') && (
            <div className="bg-white rounded-[2.5rem] p-8 mt-8 shadow-lg border border-gray-100">
              <h3 className="font-manrope text-xl font-bold mb-6 text-accent">
                Customer Information
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-inter uppercase tracking-widest text-gray-500 px-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400"
                  />
                </div>

                {orderType === 'DELIVERY' && (
                  <div className="space-y-2">
                    <label className="text-xs font-inter uppercase tracking-widest text-gray-500 px-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400"
                    />
                  </div>
                )}

                {orderType === 'DINE_IN' && (
                  <div className="space-y-2">
                    <label className="text-xs font-inter uppercase tracking-widest text-gray-500 px-1">
                      Number of Guests
                    </label>
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, '8+'].map((num) => (
                        <option key={num} value={typeof num === 'number' ? num : 8}>
                          {num} {typeof num === 'number' ? (num === 1 ? 'Person' : 'People') : '+ People'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button: Proceed to Menu */}
        <div className="fixed bottom-12 right-12">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleProceed}
            disabled={orderType === 'DINE_IN' && !localTableId}
            className="flex items-center gap-4 bg-gradient-to-br from-[#6ee591] to-[#50c878] text-[#00210c] px-10 py-6 rounded-[2rem] shadow-[0_24px_48px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                Step 2 of 3
              </span>
              <span className="font-manrope text-xl font-extrabold tracking-tight">
                Proceed to Menu
              </span>
            </div>
            <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
          </motion.button>
        </div>
      </main>
    </div>
  );
};

export default TableCustomerSelection;
