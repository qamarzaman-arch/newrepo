import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, User, Shield, ArrowRight, Loader2,
  Terminal, Globe, Cpu, Key, HelpCircle
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Identity credentials required');
      return;
    }

    setIsLoading(true);
    try {
      await login(username, password);
      toast.success('Authentication authorized');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Access denied: Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-hidden relative">
       {/* Ambient Background */}
       <div className="absolute top-0 right-0 w-[50vw] h-full bg-primary/10 blur-[120px] rounded-full translate-x-1/2" />
       <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-accent/5 blur-[100px] rounded-full -translate-x-1/2" />

       {/* Left side: Brand/Hero */}
       <div className="hidden lg:flex flex-1 flex-col p-20 justify-between relative z-10">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40">
                <img src="/assets/logo.svg" alt="" className="w-8 h-8 brightness-0 invert" />
             </div>
             <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">POSLytic</h1>
          </div>

          <div className="max-w-xl">
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
             >
                <span className="px-4 py-1.5 bg-primary/20 text-primary rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20 mb-8 inline-block">Enterprise Edition v4.0</span>
                <h2 className="text-7xl font-black text-white leading-[0.9] tracking-tighter mb-8">Architecting the future of <span className="text-primary italic">Hospitality.</span></h2>
                <p className="text-white/40 text-xl font-medium leading-relaxed italic">Unified operations, real-time intelligence, and military-grade security for the modern culinary enterprise.</p>
             </motion.div>
          </div>

          <div className="flex gap-10">
             <div className="space-y-1">
                <p className="text-white font-black text-2xl tracking-tighter">99.99%</p>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Uptime SLA</p>
             </div>
             <div className="space-y-1">
                <p className="text-white font-black text-2xl tracking-tighter">AES-256</p>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Encryption</p>
             </div>
             <div className="space-y-1">
                <p className="text-white font-black text-2xl tracking-tighter">Global</p>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Compliance</p>
             </div>
          </div>
       </div>

       {/* Right side: Login Form */}
       <div className="w-full lg:w-[600px] bg-white relative z-20 flex flex-col items-center justify-center p-12 lg:rounded-l-[4rem] shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.3)]">
          <div className="w-full max-w-sm space-y-10">
             <div className="text-center lg:text-left">
                <h3 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Secure Gateway</h3>
                <p className="text-gray-400 font-medium italic">Please verify your credentials to access the terminal.</p>
             </div>

             <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <User className="w-3 h-3" /> Identity Index
                   </label>
                   <input
                     type="text"
                     value={username}
                     onChange={(e) => setUsername(e.target.value)}
                     placeholder="Username"
                     className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-3xl font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Key className="w-3 h-3" /> Encrypted Key
                   </label>
                   <input
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     placeholder="••••••••"
                     className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-3xl font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                   />
                </div>

                <div className="flex items-center justify-between px-1">
                   <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded-lg border-2 border-gray-200 text-primary focus:ring-primary/20" />
                      <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900 transition-colors">Trust this terminal</span>
                   </label>
                   <button type="button" className="text-xs font-black uppercase text-primary hover:underline">Request Reset</button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-4 shadow-2xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all group"
                >
                   {isLoading ? (
                     <Loader2 className="w-6 h-6 animate-spin" />
                   ) : (
                     <>
                        Initialize Session
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                     </>
                   )}
                </button>
             </form>

             <div className="pt-10 border-t border-gray-50 flex items-center justify-center gap-8 opacity-20">
                <Shield className="w-6 h-6" />
                <Cpu className="w-6 h-6" />
                <Globe className="w-6 h-6" />
                <Terminal className="w-6 h-6" />
             </div>
          </div>

          <div className="absolute bottom-10 text-center">
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Hardware Protected By POSLytic Sentinel</p>
          </div>
       </div>
    </div>
  );
};

export default LoginScreen;
