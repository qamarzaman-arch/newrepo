import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
  ArrowLeft,
} from 'lucide-react';

// Order Type Selection Screen (Step 1)
const OrderTypeSelection: React.FC<{ onSelect: (type: string) => void; onBack?: () => void }> = ({ onSelect, onBack }) => {

  const orderTypes = [
    {
      id: 'WALK_IN',
      name: 'Walk-In',
      description: 'Instant checkout',
      icon: Users,
      color: 'hover:border-primary',
    },
    {
      id: 'TAKEAWAY',
      name: 'Take Away',
      description: 'Pickup ready',
      icon: ShoppingBag,
      color: 'hover:border-primary',
    },
    {
      id: 'DELIVERY',
      name: 'Delivery',
      description: 'Outbound routing',
      icon: Truck,
      color: 'hover:border-primary',
    },
    {
      id: 'DINE_IN',
      name: 'Dine-In',
      description: 'Table service',
      icon: UtensilsCrossed,
      color: 'hover:border-primary',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 relative bg-gradient-to-br from-gray-50 to-white">
      {/* Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[5%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-6xl space-y-12 z-10">
        {/* Back Button */}
        {onBack && (
          <motion.button
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md border border-gray-200 hover:border-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
            <span className="font-semibold text-gray-700">Back</span>
          </motion.button>
        )}

        <div className="text-center space-y-2">
          <h2 className="font-manrope text-4xl font-extrabold tracking-tight text-gray-900">
            Select Order Type
          </h2>
          <p className="text-gray-600 text-lg">Choose a destination to begin a new ticket session</p>
        </div>

        {/* Bento Grid of Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {orderTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(type.id)}
                className={`group relative flex flex-col items-center justify-center p-10 bg-white rounded-[2rem] hover:bg-gray-50 transition-all duration-300 border-2 border-gray-200 hover:border-primary shadow-lg hover:shadow-xl`}
              >
                <div className="w-24 h-24 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-primary-container group-hover:text-white transition-all duration-500">
                  <Icon className="w-12 h-12" />
                </div>
                <span className="font-manrope text-2xl font-bold tracking-tight text-gray-900">
                  {type.name}
                </span>
                <span className="text-sm text-gray-500 mt-2">{type.description}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderTypeSelection;
