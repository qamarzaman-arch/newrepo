import React, { useState } from 'react';
import { Shield, Lock, X, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validationService } from '../services/validationService';
import toast from 'react-hot-toast';

interface ManagerAuthorizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorized: (managerName: string) => void;
  actionName: string;
}

const ManagerAuthorizationModal: React.FC<ManagerAuthorizationModalProps> = ({
  isOpen,
  onClose,
  onAuthorized,
  actionName
}) => {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
    }
  };

  const handleClear = () => setPin('');

  const handleVerify = async () => {
    if (pin.length < 4) return;

    setIsVerifying(true);
    try {
      const response = await (validationService as any).validateManagerPin(pin, actionName);
      if (response) {
        toast.success('Authorized');
        onAuthorized('Manager'); // In real app, get name from response
        onClose();
      } else {
        toast.error('Invalid PIN');
        setPin('');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[300] p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100"
          >
            <div className="p-8 text-center bg-gray-50 border-b border-gray-100 relative">
               <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors">
                 <X className="w-6 h-6" />
               </button>
               <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary shadow-inner">
                  <Shield className="w-10 h-10" />
               </div>
               <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Manager Authorization</h3>
               <p className="text-gray-500 font-medium mt-2 italic">Required for: {actionName}</p>
            </div>

            <div className="p-10 space-y-8">
               <div className="flex justify-center gap-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        pin.length > i ? 'bg-primary scale-125 shadow-lg shadow-primary/40' : 'bg-gray-200'
                      }`}
                    />
                  ))}
               </div>

               <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleKeyPress(num.toString())}
                      className="h-16 rounded-2xl bg-gray-50 text-xl font-black text-gray-900 hover:bg-gray-100 active:scale-95 transition-all border border-gray-100"
                    >
                      {num}
                    </button>
                  ))}
                  <button onClick={handleClear} className="h-16 rounded-2xl bg-red-50 text-red-600 font-black uppercase text-xs tracking-widest hover:bg-red-100 transition-all">Clear</button>
                  <button onClick={() => handleKeyPress('0')} className="h-16 rounded-2xl bg-gray-50 text-xl font-black text-gray-900 hover:bg-gray-100 transition-all border border-gray-100">0</button>
                  <button
                    onClick={handleVerify}
                    disabled={pin.length < 4 || isVerifying}
                    className="h-16 rounded-2xl bg-primary text-white flex items-center justify-center hover:bg-primary-container disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                  >
                    {isVerifying ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                  </button>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ManagerAuthorizationModal;
