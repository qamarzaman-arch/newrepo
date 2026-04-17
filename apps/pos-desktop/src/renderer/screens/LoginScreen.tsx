import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, LogIn } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call - replace with actual authentication
    setTimeout(() => {
      if (username && password) {
        const mockUser = {
          id: '1',
          username,
          fullName: username.charAt(0).toUpperCase() + username.slice(1),
          role: 'ADMIN' as const,
        };
        const mockToken = 'mock-jwt-token';

        login(mockUser, mockToken);
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));

        toast.success('Login successful!');
        navigate('/pos');
      } else {
        toast.error('Please enter username and password');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-container to-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-lowest rounded-3xl shadow-large max-w-md w-full p-8"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-3xl font-bold font-display text-gray-900">Restaurant OS</h1>
          <p className="text-gray-600 mt-2">Point of Sale System</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                placeholder="Enter username"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full gradient-btn btn-touch flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Loading...</span>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Login</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Demo Credentials:</p>
          <p className="font-mono mt-1">admin / admin123</p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
