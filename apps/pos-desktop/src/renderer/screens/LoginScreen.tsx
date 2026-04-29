import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, LogIn, Hash, Delete, ChevronRight } from 'lucide-react';
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
      if (!pinUsername || !pin) {
        toast.error('Please enter username and PIN');
        return;
      }
      if (!/^\d{4}$/.test(pin)) {
        toast.error('PIN must be exactly 4 digits');
        return;
      }
    }

    setIsLoading(true);

    try {
      const credentials =
        loginMode === 'password' ? { username, password } : { username: pinUsername, pin };

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
      setPin((prev) => prev + digit);
    }
  };

  const clearPin = () => {
    setPin('');
  };

  const backspacePin = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* ── LEFT BRANDING PANEL (40%) ── */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-2/5 flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #7f0000 0%, #b71c1c 45%, #D32F2F 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/3 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute bottom-1/4 right-8 w-32 h-32 rounded-full bg-white/5" />

        {/* Diagonal stripe accent */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, #fff 0px, #fff 1px, transparent 1px, transparent 20px)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col flex-1 p-12 justify-between">
          {/* Top logo area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-2xl">
                <span className="text-white font-black text-3xl leading-none">P</span>
              </div>
              <span className="text-white font-black text-4xl tracking-tight">POSLytic</span>
            </div>
            <p className="text-white/70 text-sm font-semibold uppercase tracking-[0.2em] pl-1">
              Enterprise Restaurant Management
            </p>
          </motion.div>

          {/* Centre hero text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="space-y-6"
          >
            <div className="w-12 h-1 bg-white/40 rounded-full" />
            <h2 className="text-white text-5xl font-black leading-tight">
              Smarter<br />Restaurant<br />Operations
            </h2>
            <p className="text-white/65 text-base font-medium leading-relaxed max-w-xs">
              Real-time order management, kitchen display, inventory tracking and advanced analytics — all in one platform.
            </p>
            <div className="flex flex-col gap-3 pt-2">
              {['Live kitchen dispatch', 'Multi-terminal sync', 'Offline-first architecture'].map((feat) => (
                <div key={feat} className="flex items-center gap-3 text-white/80 text-sm font-medium">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <ChevronRight className="w-3 h-3 text-white" />
                  </div>
                  {feat}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bottom version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-white/40 text-xs font-semibold uppercase tracking-widest"
          >
            Version 2.0.0 &nbsp;·&nbsp; © 2025 POSLytic
          </motion.div>
        </div>
      </motion.div>

      {/* ── RIGHT LOGIN PANEL (60%) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 bg-white flex items-center justify-center p-8"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo (shown when branding panel is hidden) */}
          <div className="lg:hidden mb-10 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                <span className="text-white font-black text-xl">P</span>
              </div>
              <span className="text-neutral-900 font-black text-3xl">POSLytic</span>
            </div>
          </div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-black text-neutral-900">Welcome back</h1>
            <p className="text-neutral-500 mt-1 text-sm font-medium">
              Sign in with your credentials to continue
            </p>
          </motion.div>

          {/* Mode toggle */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex gap-1 mb-7 bg-neutral-100 p-1 rounded-xl border border-neutral-200"
          >
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                loginMode === 'password'
                  ? 'bg-white text-primary-700 shadow-sm border border-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Lock className="w-4 h-4" />
              Password
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('pin')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                loginMode === 'pin'
                  ? 'bg-white text-primary-700 shadow-sm border border-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Hash className="w-4 h-4" />
              PIN
            </button>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleLogin}>
            <AnimatePresence mode="wait">
              {loginMode === 'password' ? (
                <motion.div
                  key="password-mode"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 mb-6"
                >
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-white focus:outline-none transition-all text-neutral-900 placeholder:text-neutral-400 text-sm"
                        placeholder="Enter your username"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-white focus:outline-none transition-all text-neutral-900 placeholder:text-neutral-400 text-sm"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 font-medium pt-1">
                    Press <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-neutral-600 font-mono text-xs">Enter</kbd> to submit
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="pin-mode"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 mb-6"
                >
                  {/* Username field */}
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                      <input
                        type="text"
                        value={pinUsername}
                        onChange={(e) => setPinUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-white focus:outline-none transition-all text-neutral-900 placeholder:text-neutral-400 text-sm"
                        placeholder="Enter your username"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* PIN dots display */}
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-6 py-4 text-center">
                    <div className="flex justify-center gap-4 mb-2">
                      {[0, 1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ scale: i < pin.length ? 1 : 0.85 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`w-3.5 h-3.5 rounded-full transition-colors ${
                            i < pin.length ? 'bg-primary-600' : 'bg-neutral-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-400 font-medium">Enter 4-digit PIN</p>
                  </div>

                  {/* PIN Keypad */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <motion.button
                        key={digit}
                        type="button"
                        onClick={() => handlePinInput(digit)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.94 }}
                        className="py-4 bg-neutral-50 hover:bg-primary-50 border border-neutral-200 hover:border-primary-300 rounded-xl text-xl font-bold text-neutral-800 transition-all"
                      >
                        {digit}
                      </motion.button>
                    ))}
                    <motion.button
                      type="button"
                      onClick={clearPin}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      className="py-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold text-red-600 transition-all uppercase tracking-wider"
                    >
                      CLR
                    </motion.button>
                    <motion.button
                      key="0"
                      type="button"
                      onClick={() => handlePinInput('0')}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      className="py-4 bg-neutral-50 hover:bg-primary-50 border border-neutral-200 hover:border-primary-300 rounded-xl text-xl font-bold text-neutral-800 transition-all"
                    >
                      0
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={backspacePin}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      className="py-4 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-xl flex items-center justify-center transition-all"
                    >
                      <Delete className="w-5 h-5 text-neutral-600" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-xs text-neutral-400 font-medium mt-6"
          >
            Access is restricted to authorised personnel only.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
