import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bike } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface RiderLayoutProps {
  children: React.ReactNode;
}

const RiderLayout: React.FC<RiderLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-50 overflow-hidden">
      <header className="text-white shadow-md bg-gradient-to-r from-primary to-primary-container">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600/30 rounded-lg p-2">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-tight">Rider</h1>
              <p className="text-xs text-white/80">{user?.fullName ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 bg-primary-600/30 hover:bg-primary-600/50 px-3 py-1.5 rounded-lg text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default RiderLayout;
