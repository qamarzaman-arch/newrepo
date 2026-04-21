import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'standard' | 'terminal';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, subtitle, children, size = 'md', variant = 'standard' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw] h-[95vh]',
  };

  const variants = {
    standard: 'bg-white border-white shadow-2xl',
    terminal: 'bg-gray-950 border-primary/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-white',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-12 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40, rotateX: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40, rotateX: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full rounded-[3rem] border overflow-hidden flex flex-col',
              sizes[size as keyof typeof sizes],
              variants[variant as keyof typeof variants]
            )}
          >
            <div className={cn(
              'px-10 py-8 border-b flex items-center justify-between sticky top-0 z-10',
              variant === 'terminal' ? 'bg-gray-950/80 border-primary/10' : 'bg-white/80 border-gray-100'
            )}>
              <div>
                <div className="flex items-center gap-3">
                  {variant === 'terminal' && <Shield className="w-5 h-5 text-primary" />}
                  <h2 className="text-3xl font-black tracking-tight uppercase italic">{title}</h2>
                </div>
                {subtitle && <p className={cn('text-xs font-bold uppercase tracking-widest mt-1 italic', variant === 'terminal' ? 'text-primary/50' : 'text-gray-400')}>{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300',
                  variant === 'terminal' ? 'bg-primary/10 text-primary hover:bg-primary hover:text-black' : 'bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
