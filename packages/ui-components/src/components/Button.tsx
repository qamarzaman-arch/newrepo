import React, { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glass' | 'terminal';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-black shadow-lg shadow-primary/20',
      secondary: 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-black/20',
      outline: 'border-2 border-gray-200 bg-transparent hover:border-black hover:text-black',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
      glass: 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20',
      terminal: 'bg-gray-950 text-primary border border-primary/30 font-mono hover:bg-primary hover:text-black shadow-[0_0_15px_rgba(var(--color-primary),0.1)]',
    };

    const sizes = {
      xs: 'px-3 py-1.5 text-[10px] font-black uppercase tracking-widest',
      sm: 'px-4 py-2 text-xs font-bold uppercase tracking-wider',
      md: 'px-6 py-3 text-sm font-black uppercase tracking-tight',
      lg: 'px-8 py-4 text-base font-black uppercase tracking-tight',
      xl: 'px-10 py-5 text-lg font-black uppercase tracking-tighter',
      icon: 'p-3',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'inline-flex items-center justify-center rounded-[1.25rem] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none select-none',
          variants[variant as keyof typeof variants],
          sizes[size as keyof typeof sizes],
          className
        )}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? (
          <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <>
            {leftIcon && <span className="mr-2.5">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2.5">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
