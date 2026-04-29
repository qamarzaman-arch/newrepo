import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Users, MapPin, Phone, User, Search, X, Loader2 } from 'lucide-react';
import { useTables } from '../../hooks/useTables';
import { customerService } from '../../services/customerService';
import { getTableLockService } from '../../services/tableLockService';
import { useAuthStore } from '../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface SelectionData {
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  guestCount?: number;
}

interface Props {
  orderType: string;
  selectedTableId?: string | null;
  onSelect: (data: SelectionData) => void;
  onBack: () => void;
}

// Customer search dropdown component
const CustomerSearchDropdown: React.FC<{
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: any) => void;
}> = ({ query, isOpen, onClose, onSelect }) => {
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['customer-search', query],
    queryFn: async () => {
      if (!query || query.length < 3) return [];
      const response = await customerService.searchCustomers(query);
      return response.data.data?.customers || [];
    },
    enabled: isOpen && query.length >= 3,
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-64 overflow-y-auto"
      >
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">Search Results</span>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : searchResults?.length > 0 ? (
          <div className="p-2 space-y-1">
            {searchResults.map((customer: any) => {
              const displayName = customer.name ||
                [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
                'Unknown';
              return (
                <button
                  key={customer.id}
                  onClick={() => onSelect({ ...customer, name: displayName })}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <p className="font-semibold text-gray-900">{displayName}</p>
                  <p className="text-sm text-gray-500">{customer.phone}</p>
                  {customer.loyaltyPoints > 0 && (
                    <p className="text-xs text-amber-600 mt-0.5">⭐ {customer.loyaltyPoints} loyalty points</p>
                  )}
                  {customer.address && (
                    <p className="text-xs text-gray-400 mt-1">{customer.address}</p>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-400 text-sm">
            No customers found
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

const TableCustomerSelection: React.FC<Props> = ({ orderType, selectedTableId, onSelect, onBack }) => {
  const { user } = useAuthStore();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [localTableId, setLocalTableId] = useState<string | null>(selectedTableId || null);
  const [localTableNumber, setLocalTableNumber] = useState<string | null>(null);
  const [validationError, setValidationError] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [lockedTables, setLockedTables] = useState<Set<string>>(new Set());

  // Real-time table polling with reduced frequency and optimistic updates
  const { data: tables, refetch: refetchTables } = useTables({ isActive: true });

  // Check for locked tables
  useEffect(() => {
    const tableLockService = getTableLockService();
    const locked = new Set<string>();
    
    tables?.forEach((table: any) => {
      if (tableLockService.isTableLocked(table.id, user?.id)) {
        locked.add(table.id);
      }
    });
    
    setLockedTables(locked);
  }, [tables, user?.id]);

  useEffect(() => {
    // Poll tables every 10 seconds instead of 5 to reduce race conditions
    const interval = setInterval(() => {
      refetchTables();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetchTables]);

  // Cleanup: Release table lock when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      if (localTableId && user?.id) {
        const tableLockService = getTableLockService();
        tableLockService.unlockTable(localTableId, user.id);
      }
    };
  }, [localTableId, user?.id]);
  const availableTables = tables?.filter((t: any) => t.status === 'AVAILABLE') || [];
  const occupiedTables = tables?.filter((t: any) => t.status !== 'AVAILABLE') || [];

  const handleTableSelect = (table: any) => {
    const tableLockService = getTableLockService();
    
    // Try to lock the table
    const locked = tableLockService.lockTable(table.id, user?.id || 'unknown');
    
    if (!locked) {
      toast.error('This table is currently being selected by another cashier. Please choose a different table.');
      return;
    }
    
    // Unlock previous table if any
    if (localTableId && localTableId !== table.id) {
      tableLockService.unlockTable(localTableId, user?.id || 'unknown');
    }
    
    setLocalTableId(table.id);
    setLocalTableNumber(table.number);
    setValidationError('');
    toast.success(`Table ${table.number} locked for your order`);
  };

  const handleProceed = () => {
    if (orderType === 'DINE_IN' && !localTableId) {
      setValidationError('Please select a table to continue');
      return;
    }
    if (orderType === 'DELIVERY' && !customerName.trim()) {
      setValidationError('Customer name is required for delivery');
      return;
    }
    
    // Extend table lock when proceeding
    if (localTableId && user?.id) {
      const tableLockService = getTableLockService();
      tableLockService.extendLock(localTableId, user.id);
    }
    
    onSelect({
      tableId: localTableId || undefined,
      tableNumber: localTableNumber || undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      customerAddress: customerAddress || undefined,
      guestCount,
    });
  };

  const isDineIn = orderType === 'DINE_IN';
  const isDelivery = orderType === 'DELIVERY';
  const isPickup = orderType === 'PICKUP';

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4 shadow-sm flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.05, x: -3 }} whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
          <span className="font-semibold text-gray-700 text-sm">Back</span>
        </motion.button>
        <div>
          <h1 className="font-manrope text-2xl font-extrabold text-gray-900">
            {isDineIn ? 'Select Table' : isPickup ? 'Pickup Details' : 'Customer Details'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isDineIn ? 'Choose an available table from the floor plan' : isDelivery ? 'Enter delivery customer information' : 'Optional customer information for pickup'}
          </p>
        </div>
        {isDineIn && (
          <div className="ml-auto flex gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs font-semibold text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Available ({availableTables.length})
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs font-semibold text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Occupied ({occupiedTables.length})
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Table Grid for Dine-In */}
          {isDineIn && (
            <div>
              {availableTables.length === 0 && occupiedTables.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No tables configured</p>
                  <p className="text-sm">Ask your manager to add tables in Settings</p>
                </div>
              )}
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {availableTables.map((table: any, index: number) => (
                  <motion.button
                    key={table.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.04 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTableSelect(table)}
                    disabled={lockedTables.has(table.id)}
                    className={`aspect-square bg-white rounded-2xl p-4 flex flex-col justify-between items-center border-2 transition-all shadow-md ${
                      lockedTables.has(table.id)
                        ? 'opacity-50 cursor-not-allowed border-orange-300 bg-orange-50'
                        : localTableId === table.id
                        ? 'border-primary bg-primary-100 shadow-primary-500/30 shadow-lg'
                        : 'border-gray-200 hover:border-primary'
                    }`}
                  >
                    <span className={`font-manrope text-lg font-bold self-start ${localTableId === table.id ? 'text-primary' : 'text-gray-700'}`}>
                      {table.number}
                    </span>
                    <Users className={`w-8 h-8 ${localTableId === table.id ? 'text-primary' : 'text-gray-400'}`} />
                    <div className="flex flex-col items-center gap-0.5">
                      {lockedTables.has(table.id) ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                          In Use
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary-100 px-2 py-0.5 rounded-full">
                          Available
                        </span>
                      )}
                      {table.capacity && (
                        <span className="text-[9px] text-gray-400">{table.capacity} seats</span>
                      )}
                    </div>
                  </motion.button>
                ))}

                {occupiedTables.map((table: any) => (
                  <div
                    key={table.id}
                    className="aspect-square bg-gray-100 rounded-2xl p-4 flex flex-col justify-between items-center border-2 border-gray-200 opacity-60 cursor-not-allowed"
                  >
                    <span className="font-manrope text-lg font-bold self-start text-red-500">{table.number}</span>
                    <Users className="w-8 h-8 text-red-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                      {table.status === 'RESERVED' ? 'Reserved' : table.status === 'NEEDS_CLEANING' ? 'Cleaning' : 'Occupied'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Info Form */}
          {(isDineIn || isDelivery || isPickup) && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h3 className="font-manrope text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Customer Information
                {!isDelivery && <span className="text-xs font-normal text-gray-400 ml-1">(optional)</span>}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                    Customer Name {isDelivery && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => { setCustomerName(e.target.value); setValidationError(''); }}
                      placeholder="John Smith"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setCustomerSearchQuery(e.target.value);
                        if (e.target.value.length >= 3) {
                          setShowCustomerSearch(true);
                        } else {
                          setShowCustomerSearch(false);
                        }
                      }}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400"
                    />
                    <button
                      onClick={() => {
                        setShowCustomerSearch(!showCustomerSearch);
                        if (!showCustomerSearch && customerPhone.length >= 3) {
                          setCustomerSearchQuery(customerPhone);
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Search className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  {/* Customer Search Results */}
                  <CustomerSearchDropdown
                    query={customerSearchQuery}
                    isOpen={showCustomerSearch}
                    onClose={() => setShowCustomerSearch(false)}
                    onSelect={(customer) => {
                      const displayName = customer.name ||
                        [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '';
                      setCustomerName(displayName);
                      setCustomerPhone(customer.phone || '');
                      setCustomerAddress(customer.address || '');
                      setShowCustomerSearch(false);
                      toast.success(`Customer ${displayName} loaded`);
                    }}
                  />
                </div>

                {isDelivery && (
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                      Delivery Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <textarea
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="123 Main Street, City, State, ZIP"
                        rows={2}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400 resize-none"
                      />
                    </div>
                  </div>
                )}

                {isDineIn && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Number of Guests</label>
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Person' : 'People'}</option>
                      ))}
                      <option value={9}>9+ People</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {validationError && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            >
              {validationError}
            </motion.p>
          )}
        </div>
      </div>

      {/* Sticky Footer CTA */}
      <div className="bg-white border-t border-gray-200 px-8 py-5 flex items-center justify-between flex-shrink-0">
        <div className="text-sm text-gray-500">
        {isDineIn && localTableId && (
            <span className="font-semibold text-primary">Table {localTableNumber} selected</span>
          )}
          {isPickup && 'Pickup order will go straight to menu after details are entered'}
          {isDineIn && !localTableId && 'No table selected yet'}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleProceed}
          disabled={isDineIn && !localTableId}
          className="flex items-center gap-3 bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-2xl font-manrope font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Proceed to Menu
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  );
};

export default TableCustomerSelection;
