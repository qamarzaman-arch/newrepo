import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Users, MapPin, Phone, User, Check } from 'lucide-react';
import { useTables } from '../../hooks/useTables';

interface ReservationData {
  customerName?: string;
  customerPhone?: string;
  tableId?: string;
  tableNumber?: string;
  guestCount?: number;
  reservationDate?: string;
  reservationTime?: string;
  notes?: string;
}

interface Props {
  onSelect: (data: ReservationData) => void;
  onBack: () => void;
}

// Time slots for reservations (30-minute intervals)
const TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30',
];

const ReservationDetails: React.FC<Props> = ({ onSelect, onBack }) => {
  const { data: tables } = useTables({ isActive: true });
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedTableNumber, setSelectedTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showTimeSlots, setShowTimeSlots] = useState(false);

  // Generate available dates (next 7 days)
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  const handleTableSelect = (table: any) => {
    setSelectedTableId(table.id);
    setSelectedTableNumber(table.number);
    setValidationError('');
  };

  const handleProceed = async () => {
    if (!customerName.trim()) {
      setValidationError('Customer name is required');
      return;
    }
    if (!selectedDate) {
      setValidationError('Please select a date');
      return;
    }
    if (!selectedTime) {
      setValidationError('Please select a time');
      return;
    }
    if (!selectedTableId) {
      setValidationError('Please select a table');
      return;
    }
    
    // Check if table is available for the selected time
    // For now, we'll proceed and let the backend validate
    // In production, you'd want to check existing reservations for that time slot
    
    onSelect({
      customerName,
      customerPhone: customerPhone || undefined,
      tableId: selectedTableId,
      tableNumber: selectedTableNumber,
      guestCount,
      reservationDate: selectedDate,
      reservationTime: selectedTime,
      notes: notes || undefined,
    });
  };

  const availableTables = tables?.filter((t: any) => t.status === 'AVAILABLE') || [];
  const occupiedTables = tables?.filter((t: any) => t.status !== 'AVAILABLE') || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

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
            Create Reservation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Book a table for a future date and time
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Date Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-manrope text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Select Date
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
              {availableDates.map((date, index) => (
                <motion.button
                  key={date}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedDate(date);
                    setShowTimeSlots(true);
                    setValidationError('');
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedDate === date
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                  }`}
                >
                  <p className="text-xs text-gray-500 font-semibold uppercase">{formatDate(date)}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          <AnimatePresence>
            {showTimeSlots && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <h3 className="font-manrope text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Select Time
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                  {TIME_SLOTS.map((time, index) => (
                    <motion.button
                      key={time}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedTime(time);
                        setValidationError('');
                      }}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        selectedTime === time
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-sm font-bold text-gray-900">{time}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Guest Count */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-manrope text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Number of Guests
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-9 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((count) => (
                <motion.button
                  key={count}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setGuestCount(count);
                    setValidationError('');
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    guestCount === count
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-bold text-gray-900">{count}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Table Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-manrope text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Select Table
            </h3>
            {availableTables.length === 0 && occupiedTables.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No tables configured</p>
                <p className="text-sm">Ask your manager to add tables in Settings</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {availableTables.map((table: any, index: number) => (
                  <motion.button
                    key={table.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.04 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTableSelect(table)}
                    disabled={table.capacity < guestCount}
                    className={`aspect-square bg-white rounded-2xl p-4 flex flex-col justify-between items-center border-2 transition-all shadow-md ${
                      table.capacity < guestCount
                        ? 'opacity-40 cursor-not-allowed border-gray-200'
                        : selectedTableId === table.id
                        ? 'border-primary bg-primary/10 shadow-primary/20 shadow-lg'
                        : 'border-gray-200 hover:border-primary'
                    }`}
                  >
                    <span className={`font-manrope text-lg font-bold self-start ${selectedTableId === table.id ? 'text-primary' : 'text-gray-700'}`}>
                      {table.number}
                    </span>
                    <Users className={`w-8 h-8 ${selectedTableId === table.id ? 'text-primary' : 'text-gray-400'}`} />
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Available
                      </span>
                      {table.capacity && (
                        <span className="text-[9px] text-gray-400">{table.capacity} seats</span>
                      )}
                    </div>
                    {table.capacity < guestCount && (
                      <span className="absolute top-2 right-2 bg-red-100 text-red-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                        Too small
                      </span>
                    )}
                  </motion.button>
                ))}

                {occupiedTables.map((table: any) => (
                  <div
                    key={table.id}
                    className="aspect-square bg-gray-100 rounded-2xl p-4 flex flex-col justify-between items-center border-2 border-gray-200 opacity-60 cursor-not-allowed relative"
                  >
                    <span className="font-manrope text-lg font-bold self-start text-red-500">{table.number}</span>
                    <Users className="w-8 h-8 text-red-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                      {table.status === 'RESERVED' ? 'Reserved' : table.status === 'NEEDS_CLEANING' ? 'Cleaning' : 'Occupied'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-manrope text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  Customer Name <span className="text-red-500">*</span>
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special requests, dietary restrictions, etc."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Validation Error */}
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
          {selectedDate && selectedTime && (
            <span className="font-semibold text-primary">
              {formatDate(selectedDate)} at {selectedTime}
            </span>
          )}
          {selectedDate && selectedTime && selectedTableNumber && (
            <span className="mx-2">•</span>
          )}
          {selectedTableNumber && (
            <span className="font-semibold text-primary">Table {selectedTableNumber}</span>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleProceed}
          disabled={!customerName || !selectedDate || !selectedTime || !selectedTableId}
          className="flex items-center gap-3 bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-2xl font-manrope font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create Reservation
          <Check className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  );
};

export default ReservationDetails;
