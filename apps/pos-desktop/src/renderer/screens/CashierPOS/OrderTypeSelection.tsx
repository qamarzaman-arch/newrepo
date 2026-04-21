import React from 'react';
import { motion } from 'framer-motion';
import { Utensils, ShoppingBag, Truck, Calendar, ArrowRight, UserPlus, Zap, Terminal, Globe, Cpu } from 'lucide-react';
import { Badge } from '@poslytic/ui-components';

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
    <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-950 relative overflow-hidden">
      {/* Ambient background effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-20 relative z-10"
      >
        <div className="flex justify-center gap-4 mb-6">
           <Badge variant="terminal" dot>System Ready</Badge>
           <Badge variant="terminal">Kernel v4.2</Badge>
        </div>
        <h2 className="text-6xl font-black text-white tracking-tighter mb-4 uppercase italic leading-none">Initialize <span className="text-primary">Transaction</span></h2>
        <p className="text-white/30 text-xl font-bold max-w-lg mx-auto italic uppercase tracking-tight">Select operational workflow to begin catalog mapping</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl relative z-10">
        {options.map((opt, idx) => (
          <motion.button
            key={opt.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: idx * 0.1, type: 'spring', damping: 20 }}
            whileHover={{ scale: 1.05, y: -12 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(opt.id)}
            className="flex flex-col items-center text-center p-10 bg-white/5 backdrop-blur-xl rounded-[3.5rem] border border-white/10 group transition-all hover:border-primary/40 hover:bg-white/10 shadow-2xl"
          >
            <div className={`w-24 h-24 ${opt.color} text-black rounded-3xl flex items-center justify-center mb-10 shadow-2xl ${opt.shadow} group-hover:rotate-12 transition-transform duration-500`}>
              <opt.icon className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter italic">{opt.label}</h3>
            <p className="text-white/20 text-xs font-bold italic mb-10 uppercase tracking-widest">{opt.desc}</p>
            <div className="mt-auto w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all duration-300">
               <ArrowRight className="w-6 h-6" />
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-24 flex items-center gap-10 opacity-40">
         <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Encrypted Terminal</span>
         </div>
         <div className="w-2 h-2 bg-white/20 rounded-full" />
         <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Global Sync Active</span>
         </div>
         <div className="w-2 h-2 bg-white/20 rounded-full" />
         <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Load Balancing</span>
         </div>
      </div>
    </div>
  );
};

export default OrderTypeSelection;
