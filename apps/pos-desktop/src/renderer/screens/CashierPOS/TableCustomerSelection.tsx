import { TableSkeleton } from '@poslytic/ui-components';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, User, ArrowLeft, ArrowRight, Search, MapPin, Plus, CheckCircle, Info, Calendar } from 'lucide-react';
import { useTables } from '../../hooks/useTables';
import { useCustomers } from '../../hooks/useCustomers';

interface Props {
  orderType: string;
  onBack: () => void;
  onSelect: (table: any, customer: any, guests: number) => void;
}

const TableCustomerSelection: React.FC<Props> = ({ orderType, onBack, onSelect }) => {
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [customerSearch, setCustomerSearch] = useState('');

  const { data: tables, isLoading: isLoadingTables } = useTables();
  const { data: customers } = useCustomers();

  const handleComplete = () => {
    if (orderType === 'DINE_IN' && !selectedTable) return;
    onSelect(selectedTable, selectedCustomer, guestCount);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      <header className="bg-white border-b border-gray-100 p-8 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all group">
               <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-gray-900 transition-colors" />
            </button>
            <div>
               <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Terminal Mapping</h2>
               <p className="text-gray-500 font-medium italic">Context: {orderType} Transaction</p>
            </div>
         </div>
         <button
           onClick={handleComplete}
           disabled={orderType === 'DINE_IN' && !selectedTable}
           className="flex items-center gap-3 px-10 py-5 bg-primary text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
         >
            Begin Catalog Entry
            <ArrowRight className="w-5 h-5" />
         </button>
      </header>

      <main className="flex-1 flex overflow-hidden">
         {/* LEFT: Table Selection */}
         <div className="flex-1 p-10 overflow-y-auto border-r border-gray-100 scrollbar-hide">
            <div className="flex items-center justify-between mb-10">
               <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-primary" />
                  Floor Coordinates
               </h3>
               <div className="flex gap-2">
                  <span className="px-4 py-2 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">Live Availability</span>
               </div>
            </div>

            {isLoadingTables ? <TableSkeleton /> : (
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {tables?.map((table: any) => (
                    <motion.button
                      key={table.id}
                      whileHover={table.status === 'AVAILABLE' ? { scale: 1.05, y: -5 } : {}}
                      onClick={() => table.status === 'AVAILABLE' && setSelectedTable(table)}
                      className={`relative p-6 rounded-[2.5rem] border-4 transition-all ${
                        selectedTable?.id === table.id
                          ? 'border-primary bg-primary/5 shadow-2xl'
                          : table.status === 'AVAILABLE'
                            ? 'border-gray-100 bg-white hover:border-primary/20 hover:shadow-xl'
                            : 'border-red-100 bg-red-50/50 opacity-40 cursor-not-allowed'
                      }`}
                    >
                       <div className="flex justify-between items-start mb-4">
                          <span className="text-2xl font-black tracking-tighter">#{table.number}</span>
                          <div className="flex items-center gap-1 opacity-60">
                             <Users className="w-3 h-3" />
                             <span className="text-[10px] font-black">{table.capacity}</span>
                          </div>
                       </div>
                       <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-4">{table.status}</div>
                       {selectedTable?.id === table.id && (
                          <div className="absolute top-2 right-2 p-1 bg-primary text-white rounded-full shadow-lg">
                             <CheckCircle className="w-4 h-4" />
                          </div>
                       )}
                    </motion.button>
                  ))}
               </div>
            )}
         </div>

         {/* RIGHT: Customer & Details */}
         <div className="w-full lg:w-[450px] bg-white p-10 overflow-y-auto space-y-12">
            <section>
               <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">Client Index</h3>
               <div className="relative group mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by ID or Phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  />
               </div>

               <div className="space-y-3">
                  {customers?.filter((c: any) => c.fullName.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 3).map((cust: any) => (
                    <button
                      key={cust.id}
                      onClick={() => setSelectedCustomer(cust)}
                      className={`w-full p-6 flex items-center justify-between rounded-[2rem] border-2 transition-all ${
                        selectedCustomer?.id === cust.id ? 'border-primary bg-primary/5 shadow-lg' : 'border-gray-50 bg-gray-50 hover:bg-white hover:border-gray-200'
                      }`}
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black">{cust.fullName.charAt(0)}</div>
                          <div className="text-left">
                             <p className="font-black text-gray-900 text-sm">{cust.fullName}</p>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cust.phone}</p>
                          </div>
                       </div>
                       <span className="text-[10px] font-black text-primary uppercase">{cust.loyaltyPoints} PTS</span>
                    </button>
                  ))}
                  <button className="w-full p-6 border-2 border-dashed border-gray-100 rounded-[2rem] flex items-center justify-center gap-3 text-gray-400 font-black uppercase text-xs tracking-widest hover:bg-gray-50 hover:text-gray-600 transition-all">
                     <Plus className="w-5 h-5" />
                     Register New Member
                  </button>
               </div>
            </section>

            <section>
               <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">Capacity Allocation</h3>
               <div className="flex items-center justify-between p-8 bg-gray-900 text-white rounded-[2.5rem] shadow-2xl">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Guest Count</p>
                     <p className="text-4xl font-black tracking-tighter">{guestCount} <span className="text-lg text-white/50 italic">Nodes</span></p>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all"><span className="text-2xl font-black">−</span></button>
                     <button onClick={() => setGuestCount(guestCount + 1)} className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center hover:bg-primary-container transition-all shadow-lg shadow-primary/20"><span className="text-2xl font-black">+</span></button>
                  </div>
               </div>
            </section>

            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-start gap-4">
               <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
               <p className="text-xs text-blue-800 font-medium italic leading-relaxed">
                  Terminal configuration is optimized for rapid throughput. Table assignments are synchronized with the central kitchen display system in real-time.
               </p>
            </div>
         </div>
      </main>
    </div>
  );
};

export default TableCustomerSelection;
