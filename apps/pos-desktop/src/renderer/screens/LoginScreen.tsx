import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, LogIn, Sparkles, Hash, Delete } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

type LoginMode = 'password' | 'pin';

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [pinUsername, setPinUsername] = useState('');
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle keyboard input for PIN mode
  useEffect(() => {
    if (loginMode !== 'pin') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        backspacePin();
      } else if (e.key === 'Escape') {
        clearPin();
      } else if (e.key === 'Enter') {
        // Auto-submit if PIN is complete
        if (pin.length >= 4 && pinUsername) {
          const form = document.querySelector('form');
          if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginMode, pin, pinUsername]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginMode === 'password') {
      if (!username || !password) {
        toast.error('Please enter username and password');
        return;
      }
    } else {
      if (!pinUsername || !pin || pin.length < 4) {
        toast.error('Please enter username and PIN (min 4 digits)');
        return;
      }
    }

    setIsLoading(true);

    try {
      const credentials = loginMode === 'password' 
        ? { username, password }
        : { username: pinUsername, pin };
      
      const response = await authService.login(credentials);
      const { user, token } = response.data.data;

      login(user, token);
      toast.success(`Welcome ${user.fullName || user.username}!`);
      
      // Redirect based on user role
      if (user.role === 'KITCHEN') {
        navigate('/kitchen');
      } else if (user.role === 'RIDER') {
        navigate('/rider-deliveries');
      } else if (user.role === 'CASHIER') {
        navigate('/cashier-pos');
      } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
        navigate('/dashboard');
      } else {
        navigate('/pos');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const clearPin = () => {
    setPin('');
  };

  const backspacePin = () => {
    setPin(prev => prev.slice(0, -1));
  };

  // Floating particles animation
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 20 + 10,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-container to-secondary relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background Particles */}
      <AnimatePresence>
        {mounted && particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.2, 1],
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute rounded-full bg-white/10 backdrop-blur-sm"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Gradient Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-20 left-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-surface-lowest/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 relative z-10 border border-white/20"
      >
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="inline-block mb-4"
          >
            <img src="/assets/logo.svg" alt="POSLytic" className="h-20 mx-auto drop-shadow-lg" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold font-display bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          >
            POSLytic
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mt-2 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            Smart Restaurant Management
            <Sparkles className="w-4 h-4 text-accent" />
          </motion.p>
        </motion.div>

        {/* Login Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl"
        >
          <button
            type="button"
            onClick={() => setLoginMode('password')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              loginMode === 'password'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </div>
          </button>
          <button
            type="button"
            onClick={() => setLoginMode('pin')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              loginMode === 'pin'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Hash className="w-4 h-4" />
              PIN
            </div>
          </button>
        </motion.div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <AnimatePresence mode="wait">
            {loginMode === 'password' ? (
              <motion.div
                key="password-mode"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-all duration-300 hover:border-primary/50"
                      placeholder="Enter username"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-all duration-300 hover:border-primary/50"
                      placeholder="Enter password"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="pin-mode"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Username for PIN login */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      value={pinUsername}
                      onChange={(e) => setPinUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-all"
                      placeholder="Enter username"
                      autoFocus
                    />
                  </div>
                </div>

                {/* PIN Display */}
                <div className="bg-gray-100 rounded-xl p-4 mb-4">
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full transition-all ${
                          i < pin.length ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-2">
                    Enter your PIN
                  </p>
                </div>

                {/* PIN Keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handlePinInput(digit)}
                      className="py-4 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-bold text-gray-700 transition-colors active:scale-95"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearPin}
                    className="py-4 bg-red-100 hover:bg-red-200 rounded-xl text-sm font-semibold text-red-600 transition-colors active:scale-95"
                  >
                    CLR
                  </button>
                  <button
                    key="0"
                    type="button"
                    onClick={() => handlePinInput('0')}
                    className="py-4 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-bold text-gray-700 transition-colors active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={backspacePin}
                    className="py-4 bg-gray-200 hover:bg-gray-300 rounded-xl flex items-center justify-center transition-colors active:scale-95"
                  >
                    <Delete className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full gradient-btn btn-touch flex items-center justify-center gap-2 relative overflow-hidden group"
          >
            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.5 }}
            />
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Login to POSLytic</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center text-sm text-gray-600 space-y-2"
        >
          <p className="font-semibold">Demo Credentials:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded-lg">
              <p className="font-mono text-primary font-semibold">cashier1</p>
              <p className="text-gray-500">Pass: cashier123</p>
              <p className="text-gray-400">or PIN: 1234</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg">
              <p className="font-mono text-primary font-semibold">admin</p>
              <p className="text-gray-500">Pass: admin123</p>
              <p className="text-gray-400">or PIN: 0000</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            All roles can login with PIN - just enter PIN and click Login
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
