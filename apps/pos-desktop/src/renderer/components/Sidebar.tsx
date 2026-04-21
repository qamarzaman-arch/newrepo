import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Users,
  ChefHat,
  Table,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  PieChart,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingCart, label: 'Ledger', path: '/orders' },
  { icon: ChefHat, label: 'Kitchen', path: '/kitchen' },
  { icon: Table, label: 'Floor Plan', path: '/tables' },
  { icon: Package, label: 'Catalog', path: '/menu' },
  { icon: Building2, label: 'Supply', path: '/inventory' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: ShieldAlert, label: 'Personnel', path: '/staff' },
  { icon: BarChart3, label: 'Intelligence', path: '/reports' },
  { icon: Settings, label: 'Enterprise', path: '/settings' },
];

const kitchenMenuItems = [
  { icon: ChefHat, label: 'Console', path: '/kitchen' },
  { icon: ShoppingCart, label: 'Queue', path: '/orders' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  let menuItems = adminMenuItems;
  if (user?.role === 'KITCHEN') menuItems = kitchenMenuItems;

  return (
    <aside className="w-80 bg-gray-950 text-white flex flex-col h-screen sticky top-0 border-r border-white/5">
      {/* Brand Identity */}
      <div className="p-10">
        <Link to="/dashboard" className="flex items-center gap-4 group">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:rotate-6 transition-transform">
             <img src="/assets/logo.svg" alt="" className="w-6 h-6 brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic group-hover:text-primary transition-colors">POSLytic</h1>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] -mt-1">Enterprise OS</p>
          </div>
        </Link>
      </div>

      {/* Navigation Matrix */}
      <nav className="flex-1 px-6 space-y-2 overflow-y-auto scrollbar-hide py-4">
        {menuItems.map((item, idx) => {
           const isActive = location.pathname === item.path;
           return (
             <motion.div
               key={idx}
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: idx * 0.05 }}
             >
                <Link
                  to={item.path}
                  className={`group flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all duration-500 ${
                    isActive
                      ? 'bg-primary text-white shadow-2xl shadow-primary/20 scale-105'
                      : 'text-white/40 hover:bg-white/5 hover:text-white'
                  }`}
                >
                   <item.icon className={`w-5 h-5 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-6'}`} />
                   <span className="font-black uppercase text-[10px] tracking-widest flex-1">{item.label}</span>
                   {isActive && <ChevronRight className="w-3 h-3 text-white/50" />}
                </Link>
             </motion.div>
           );
        })}
      </nav>

      {/* User Context & Termination */}
      <div className="p-8">
         <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black">
                  {user?.fullName?.charAt(0)}
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate">{user?.fullName}</p>
                  <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{user?.role} NODE</p>
               </div>
            </div>
            <button
              onClick={logout}
              className="w-full py-3 bg-red-950/30 text-red-400 hover:bg-red-600 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-red-900/20"
            >
               Terminate Session
            </button>
         </div>
      </div>
    </aside>
  );
};

export default Sidebar;
