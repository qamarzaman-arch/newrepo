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
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const clearPin = () => {
    setPin('');
  };

  const backspacePin = () => {
    setPin(prev => prev.slice(0, -1));
  };

  // Background particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 20 + 10,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 relative overflow-hidden flex items-center justify-center p-4">
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

      {/* Gradient Orbs - Red Theme */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.15, 0.35, 0.15],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-20 left-20 w-96 h-96 bg-primary-400/40 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.3, 1, 1.3],
          opacity: [0.15, 0.35, 0.15],
        }}
        transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-primary-500/30 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{ duration: 12, repeat: Infinity, delay: 2 }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl"
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-neutral-0/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 relative z-10 border-2 border-white/30"
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
            className="text-5xl font-bold font-display bg-gradient-to-r from-white to-primary-100 bg-clip-text text-transparent"
          >
            POSLytic
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/80 mt-2 flex items-center justify-center gap-2 font-medium"
          >
            <Sparkles className="w-4 h-4 text-primary-200" />
            Smart Restaurant Management
            <Sparkles className="w-4 h-4 text-primary-200" />
          </motion.p>
        </motion.div>

        {/* Login Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex gap-2 mb-6 bg-white/10 backdrop-blur-sm p-1.5 rounded-2xl border border-white/20"
        >
          <button
            type="button"
            onClick={() => setLoginMode('password')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
              loginMode === 'password'
                ? 'bg-white text-primary-700 shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/10'
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
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
              loginMode === 'pin'
                ? 'bg-white text-primary-700 shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/10'
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
                  <label className="block text-sm font-semibold text-white/90 mb-2">
                    Username
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-primary-200 transition-colors" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl focus:border-primary-200 focus:bg-white/20 focus:outline-none transition-all duration-300 hover:border-white/30 text-white placeholder:text-white/40"
                      placeholder="Enter username"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-primary-200 transition-colors" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl focus:border-primary-200 focus:bg-white/20 focus:outline-none transition-all duration-300 hover:border-white/30 text-white placeholder:text-white/40"
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
                  <label className="block text-sm font-semibold text-white/90 mb-2">
                    Username
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-primary-200 transition-colors" />
                    <input
                      type="text"
                      value={pinUsername}
                      onChange={(e) => setPinUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl focus:border-primary-200 focus:bg-white/20 focus:outline-none transition-all text-white placeholder:text-white/40"
                      placeholder="Enter username"
                      autoFocus
                    />
                  </div>
                </div>

                {/* PIN Display */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-4 border border-white/20">
                  <div className="flex justify-center gap-4">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: i < pin.length ? 1 : 0.8 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className={`w-4 h-4 rounded-full transition-all ${
                          i < pin.length ? 'bg-primary-200 shadow-lg shadow-primary-500/50' : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-center text-sm text-white/60 mt-3 font-medium">
                    Enter your PIN (4 digits)
                  </p>
                </div>

                {/* PIN Keypad */}
                <div className="grid grid-cols-3 gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <motion.button
                      key={digit}
                      type="button"
                      onClick={() => handlePinInput(digit)}
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
                      whileTap={{ scale: 0.95 }}
                      className="py-4 bg-white/10 backdrop-blur-sm border border-white/20 hover:border-white/40 rounded-2xl text-2xl font-bold text-white transition-all active:scale-95 shadow-lg"
                    >
                      {digit}
                    </motion.button>
                  ))}
                  <motion.button
                    type="button"
                    onClick={clearPin}
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.3)' }}
                    whileTap={{ scale: 0.95 }}
                    className="py-4 bg-error-500/20 backdrop-blur-sm border border-error-400/30 hover:border-error-400/50 rounded-2xl text-sm font-semibold text-error-200 transition-all active:scale-95 shadow-lg"
                  >
                    CLR
                  </motion.button>
                  <motion.button
                    key="0"
                    type="button"
                    onClick={() => handlePinInput('0')}
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
                    whileTap={{ scale: 0.95 }}
                    className="py-4 bg-white/10 backdrop-blur-sm border border-white/20 hover:border-white/40 rounded-2xl text-2xl font-bold text-white transition-all active:scale-95 shadow-lg"
                  >
                    0
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={backspacePin}
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
                    whileTap={{ scale: 0.95 }}
                    className="py-4 bg-white/20 backdrop-blur-sm border border-white/30 hover:border-white/50 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-lg"
                  >
                    <Delete className="w-6 h-6 text-white" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(229, 57, 53, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-primary-700 font-bold py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-2 relative overflow-hidden group border-2 border-white/50"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.5 }}
            />
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary-700 border-t-transparent rounded-full"
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
          className="mt-8 text-center text-sm text-white/70 space-y-2"
        >
          <p className="font-semibold text-white/90">Secure Access</p>
          <p className="text-xs text-white/50 mt-2">
            Sign in with the credentials assigned to your account.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
