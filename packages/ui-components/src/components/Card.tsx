import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CardProps extends HTMLMotionProps<'div'> {
  hoverable?: boolean;
  variant?: 'white' | 'terminal' | 'glass' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable, variant = 'white', padding = 'md', children, ...props }, ref) => {
    const variants = {
      white: 'bg-white border-gray-100 shadow-sm',
      terminal: 'bg-gray-950 border-primary/20 shadow-[0_0_20px_rgba(0,0,0,0.5)]',
      glass: 'bg-white/70 backdrop-blur-xl border-white/40 shadow-xl',
      bordered: 'bg-transparent border-2 border-gray-200',
    };

    const paddings = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-8',
      lg: 'p-10',
      xl: 'p-14',
    };

    return (
      <motion.div
        ref={ref}
        whileHover={hoverable ? { y: -8, transition: { duration: 0.3 } } : undefined}
        className={cn(
          'rounded-[2.5rem] border transition-all duration-500 overflow-hidden',
          variants[variant as keyof typeof variants],
          paddings[padding as keyof typeof paddings],
          hoverable && 'hover:shadow-2xl hover:border-primary/20',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
