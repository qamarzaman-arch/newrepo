import React from 'react';
import { motion } from 'framer-motion';
import { Utensils, ShoppingBag, Truck, Calendar, ArrowRight, UserPlus, Zap } from 'lucide-react';

interface Props {
  onSelect: (type: string) => void;
}

const OrderTypeSelection: React.FC<Props> = ({ onSelect }) => {
  const options = [
    { id: 'DINE_IN', label: 'Dine-In', icon: Utensils, color: 'bg-primary', desc: 'Table service & floor management', shadow: 'shadow-primary/30' },
    { id: 'TAKEAWAY', label: 'Takeaway', icon: ShoppingBag, color: 'bg-blue-600', desc: 'Pick up orders at counter', shadow: 'shadow-blue-600/30' },
    { id: 'DELIVERY', label: 'Home Delivery', icon: Truck, color: 'bg-indigo-600', desc: 'Rider dispatch & GPS tracking', shadow: 'shadow-indigo-600/30' },
    { id: 'RESERVATION', label: 'Pre-Booking', icon: Calendar, color: 'bg-purple-600', desc: 'Scheduled future arrivals', shadow: 'shadow-purple-600/30' },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h2 className="text-5xl font-black text-gray-900 tracking-tight mb-4">Initialize <span className="text-primary italic">Transaction</span></h2>
        <p className="text-gray-500 text-xl font-medium max-w-lg mx-auto italic">Select the operational workflow for this customer interaction to begin catalog mapping.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl">
        {options.map((opt, idx) => (
          <motion.button
            key={opt.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05, y: -10 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(opt.id)}
            className="flex flex-col items-center text-center p-10 bg-white rounded-[3rem] shadow-sm border border-gray-100 group transition-all hover:shadow-2xl"
          >
            <div className={`w-20 h-20 ${opt.color} text-white rounded-3xl flex items-center justify-center mb-8 shadow-xl ${opt.shadow} group-hover:rotate-6 transition-transform`}>
              <opt.icon className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-tight">{opt.label}</h3>
            <p className="text-gray-400 text-sm font-bold italic mb-8">{opt.desc}</p>
            <div className="mt-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
               <ArrowRight className="w-6 h-6" />
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-20 flex gap-6">
         <button className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">
            <Zap className="w-4 h-4 text-primary" />
            Quick Walk-in
         </button>
         <button className="flex items-center gap-3 px-8 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-50 transition-all">
            <UserPlus className="w-4 h-4" />
            Loyalty Lookup
         </button>
      </div>
    </div>
  );
};

export default OrderTypeSelection;
