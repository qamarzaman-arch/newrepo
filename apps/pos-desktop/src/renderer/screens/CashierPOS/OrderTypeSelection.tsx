import React from 'react';
import { motion } from 'framer-motion';
import { Users, ShoppingBag, Truck, UtensilsCrossed } from 'lucide-react';

// Static Tailwind classes — dynamic strings get purged in production
const orderTypes = [
  {
    id: 'DINE_IN',
    name: 'Dine-In',
    description: 'Table service',
    icon: UtensilsCrossed,
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    hoverBorder: 'hover:border-blue-500',
    hoverIconBg: 'group-hover:bg-blue-500',
  },
  {
    id: 'WALK_IN',
    name: 'Walk-In',
    description: 'Instant checkout',
    icon: Users,
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
    hoverBorder: 'hover:border-green-500',
    hoverIconBg: 'group-hover:bg-green-500',
  },
  {
    id: 'TAKEAWAY',
    name: 'Take Away',
    description: 'Pickup ready',
    icon: ShoppingBag,
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    hoverBorder: 'hover:border-amber-500',
    hoverIconBg: 'group-hover:bg-amber-500',
  },
  {
    id: 'DELIVERY',
    name: 'Delivery',
    description: 'Outbound routing',
    icon: Truck,
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    hoverBorder: 'hover:border-purple-500',
    hoverIconBg: 'group-hover:bg-purple-500',
  },
];

const OrderTypeSelection: React.FC<{
  onSelect: (type: string) => void;
  onBack?: () => void;
}> = ({ onSelect }) => (
  <div className="flex-1 flex flex-col items-center justify-center px-8 h-full bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
    <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
    <div className="absolute top-[40%] -right-[5%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

    <div className="w-full max-w-5xl space-y-10 z-10">
      <div className="text-center space-y-2">
        <h2 className="font-manrope text-4xl font-extrabold tracking-tight text-gray-900">
          Select Order Type
        </h2>
        <p className="text-gray-500 text-lg">Choose how this order will be served</p>
        <p className="text-xs text-gray-400">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">F1</kbd> to start a new order anytime
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {orderTypes.map((type, index) => {
          const Icon = type.icon;
          return (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(type.id)}
              className={`group flex flex-col items-center justify-center p-10 bg-white rounded-[2rem] border-2 border-gray-200 ${type.hoverBorder} shadow-lg hover:shadow-xl transition-all duration-300`}
            >
              <div className={`w-24 h-24 rounded-3xl ${type.iconBg} ${type.iconText} ${type.hoverIconBg} group-hover:text-white flex items-center justify-center mb-6 transition-all duration-500`}>
                <Icon className="w-12 h-12" />
              </div>
              <span className="font-manrope text-2xl font-bold tracking-tight text-gray-900">{type.name}</span>
              <span className="text-sm text-gray-500 mt-2">{type.description}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  </div>
);

export default OrderTypeSelection;
