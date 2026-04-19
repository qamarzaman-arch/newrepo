import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface KitchenLayoutProps {
  children: React.ReactNode;
}

const KitchenLayout: React.FC<KitchenLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Route guard: only KITCHEN or ADMIN/MANAGER roles can access
  React.useEffect(() => {
    if (!user || (user.role !== 'KITCHEN' && user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      toast.error('Access denied: Kitchen role required');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-900">
      {/* Minimal Header for Kitchen */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-black text-lg">K</span>
          </div>
          <div>
            <h1 className="font-manrope text-lg font-bold text-white">Kitchen Display System</h1>
            <p className="text-xs text-gray-400">Real-time Order Management</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{user?.fullName || 'Kitchen Staff'}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.fullName?.charAt(0) || 'K'}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>
      </header>

      {/* Full-Screen Content */}
      <main className="h-[calc(100vh-64px)] overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default KitchenLayout;
