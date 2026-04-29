import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, ShoppingBag, Truck, UtensilsCrossed, Calendar, ChevronRight } from 'lucide-react';

// Static Tailwind classes — dynamic strings get purged in production
const orderTypes = [
  {
    id: 'DINE_IN',
    key: 'D',
    name: 'Dine-In',
    description: 'Table service',
    icon: UtensilsCrossed,
  },
  {
    id: 'PICKUP',
    key: 'P',
    name: 'Pickup',
    description: 'Counter pickup',
    icon: ShoppingBag,
  },
  {
    id: 'DELIVERY',
    key: 'L',
    name: 'Delivery',
    description: 'Home delivery',
    icon: Truck,
  },
];

const OrderTypeSelection: React.FC<{
  onSelect: (type: string) => void;
  onBack?: () => void;
}> = ({ onSelect }) => {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toUpperCase();
      if (key === 'D') onSelect('DINE_IN');
      else if (key === 'P') onSelect('PICKUP');
      else if (key === 'L') onSelect('DELIVERY');
      else if (key === 'R') onSelect('RESERVATION');
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onSelect]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 h-full bg-white relative overflow-hidden">
      {/* Decorative red gradient blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-primary-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-3xl space-y-10 z-10">

        {/* Title block */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 text-white mb-4 shadow-lg shadow-primary-500/30">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h2 className="text-4xl font-black text-neutral-900 tracking-tight">
            New Order
          </h2>
          <p className="text-neutral-500 text-base">Select order type to begin</p>
        </motion.div>

        {/* 3 main order type cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {orderTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.08, type: 'spring', stiffness: 200 }}
                whileHover={{ scale: 1.03, boxShadow: '0 12px 32px rgba(229,57,53,0.18)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(type.id)}
                className="group flex flex-col items-center justify-center gap-5 p-10 bg-white rounded-3xl border-2 border-neutral-200 hover:border-primary-600 hover:bg-primary-50 shadow-md hover:shadow-xl transition-all duration-200 relative"
              >
                {/* Keyboard hint badge */}
                <span className="absolute top-3 right-3 w-6 h-6 rounded-md bg-neutral-100 group-hover:bg-primary-100 text-neutral-500 group-hover:text-primary-700 text-xs font-black flex items-center justify-center transition-colors border border-neutral-200 group-hover:border-primary-200">
                  {type.key}
                </span>

                {/* Icon circle */}
                <div className="w-20 h-20 rounded-full bg-neutral-100 group-hover:bg-primary-600 flex items-center justify-center transition-colors duration-200 shadow-sm">
                  <Icon className="w-10 h-10 text-neutral-500 group-hover:text-white transition-colors duration-200" />
                </div>

                <div className="text-center">
                  <span className="block text-xl font-black text-neutral-900">{type.name}</span>
                  <span className="block text-sm text-neutral-500 mt-1 group-hover:text-primary-700 transition-colors">{type.description}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Reservation — secondary link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.42 }}
          className="flex flex-col items-center gap-3"
        >
          <button
            type="button"
            onClick={() => onSelect('RESERVATION')}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-600 shadow-sm hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Reservation
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Keyboard hint row */}
          <p className="text-xs text-neutral-400 tracking-wide">
            <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-neutral-500 font-mono text-[11px]">D</kbd>
            {' '}Dine-In{'  '}
            <kbd className="ml-2 px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-neutral-500 font-mono text-[11px]">P</kbd>
            {' '}Pickup{'  '}
            <kbd className="ml-2 px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-neutral-500 font-mono text-[11px]">L</kbd>
            {' '}Delivery{'  '}
            <kbd className="ml-2 px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-neutral-500 font-mono text-[11px]">R</kbd>
            {' '}Reservation
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderTypeSelection;
