import { TableSkeleton } from '@poslytic/ui-components';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, User, ArrowLeft, ArrowRight, Search, MapPin, Plus, CheckCircle, Info, Calendar, LayoutGrid, Monitor } from 'lucide-react';
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
    <div className="h-full flex flex-col bg-gray-950 overflow-hidden text-white">
      <header className="bg-gray-900/50 border-b border-white/5 p-8 flex items-center justify-between shadow-2xl">
         <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group">
               <ArrowLeft className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
            </button>
            <div>
               <h2 className="text-3xl font-black tracking-tight uppercase italic">Terminal <span className="text-primary">Mapping</span></h2>
               <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-1">Context: {orderType} Operational Node</p>
            </div>
         </div>
         <button
           onClick={handleComplete}
           disabled={orderType === 'DINE_IN' && !selectedTable}
           className="flex items-center gap-3 px-10 py-5 bg-primary text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-20"
         >
            Initialize Catalog
            <ArrowRight className="w-5 h-5" />
         </button>
      </header>

      <main className="flex-1 flex overflow-hidden">
         {/* LEFT: Table Selection */}
         <div className="flex-1 p-10 overflow-y-auto border-r border-white/5 scrollbar-hide bg-gray-950">
            <div className="flex items-center justify-between mb-10">
               <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 italic">
                  <Monitor className="w-6 h-6 text-primary" />
                  Floor Geometry
               </h3>
               <div className="flex gap-2">
                  <Badge variant="terminal" dot>Real-time telemetry</Badge>
               </div>
            </div>

            {isLoadingTables ? <TableSkeleton variant="terminal" /> : (
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {tables?.map((table: any) => (
                    <motion.button
                      key={table.id}
                      whileHover={table.status === 'AVAILABLE' ? { scale: 1.05, y: -5 } : {}}
                      onClick={() => table.status === 'AVAILABLE' && setSelectedTable(table)}
                      className={`relative p-8 rounded-[2.5rem] border-4 transition-all duration-500 ${
                        selectedTable?.id === table.id
                          ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--color-primary),0.2)]'
                          : table.status === 'AVAILABLE'
                            ? 'border-white/5 bg-white/5 hover:border-primary/30 hover:bg-white/10'
                            : 'border-red-900/20 bg-red-950/10 opacity-30 cursor-not-allowed'
                      }`}
                    >
                       <div className="flex justify-between items-start mb-6">
                          <span className="text-3xl font-black tracking-tighter italic">#{table.number}</span>
                          <div className="flex items-center gap-1 opacity-40">
                             <Users className="w-4 h-4" />
                             <span className="text-xs font-black">{table.capacity}</span>
                          </div>
                       </div>
                       <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{table.status}</div>
                       {selectedTable?.id === table.id && (
                          <div className="absolute -top-3 -right-3 p-2 bg-primary text-white rounded-full shadow-2xl animate-in zoom-in">
                             <CheckCircle className="w-5 h-5" />
                          </div>
                       )}
                    </motion.button>
                  ))}
               </div>
            )}
         </div>

         {/* RIGHT: Customer & Details */}
         <div className="w-full lg:w-[480px] bg-gray-900/50 p-12 overflow-y-auto space-y-12 backdrop-blur-xl">
            <section>
               <h3 className="text-xl font-black uppercase tracking-tight mb-8 italic">Client Identity</h3>
               <div className="relative group mb-8">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="SCAN OR SEARCH UID..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs tracking-widest focus:bg-white/10 focus:ring-4 focus:ring-primary/5 transition-all outline-none uppercase"
                  />
               </div>

               <div className="space-y-4">
                  {customers?.filter((c: any) => c.fullName.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 3).map((cust: any) => (
                    <button
                      key={cust.id}
                      onClick={() => setSelectedCustomer(cust)}
                      className={`w-full p-6 flex items-center justify-between rounded-[2rem] border-2 transition-all duration-300 ${
                        selectedCustomer?.id === cust.id ? 'border-primary bg-primary/5 shadow-xl' : 'border-white/5 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-xl bg-gray-950 text-primary border border-primary/20 flex items-center justify-center font-black text-lg shadow-inner">{cust.fullName.charAt(0)}</div>
                          <div className="text-left">
                             <p className="font-black text-sm uppercase tracking-tight">{cust.fullName}</p>
                             <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{cust.phone}</p>
                          </div>
                       </div>
                       <Badge variant="terminal">{cust.loyaltyPoints} PTS</Badge>
                    </button>
                  ))}
                  <button className="w-full py-6 border-2 border-dashed border-white/10 rounded-[2rem] flex items-center justify-center gap-3 text-white/20 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all">
                     <Plus className="w-5 h-5 text-primary" />
                     Register New Node
                  </button>
               </div>
            </section>

            <section>
               <h3 className="text-xl font-black uppercase tracking-tight mb-8 italic">Throughput Scale</h3>
               <div className="p-8 bg-gray-950 border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                  <div className="flex items-center justify-between relative z-10">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Payload Count</p>
                       <p className="text-5xl font-black tracking-tighter text-white">{guestCount} <span className="text-lg text-primary italic">Units</span></p>
                    </div>
                    <div className="flex gap-3">
                       <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/5"><span className="text-3xl font-black">−</span></button>
                       <button onClick={() => setGuestCount(guestCount + 1)} className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center hover:bg-primary/80 transition-all shadow-xl shadow-primary/20"><span className="text-3xl font-black text-black">+</span></button>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors" />
               </div>
            </section>

            <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 flex items-start gap-5">
               <Info className="w-6 h-6 text-primary flex-shrink-0" />
               <p className="text-xs text-primary/60 font-bold italic leading-relaxed uppercase tracking-tight">
                  Operational parameters are synchronized with the central hive. Table assignments are high-priority interrupts for the kitchen display matrix.
               </p>
            </div>
         </div>
      </main>
    </div>
  );
};

export default TableCustomerSelection;
