import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary' | 'terminal';
  dot?: boolean;
  size?: 'sm' | 'md';
}

export const Badge = ({ className, variant = 'neutral', dot, size = 'md', ...props }: BadgeProps) => {
  const variants = {
    success: 'bg-green-50 text-green-600 border-green-200/50 shadow-[0_0_10px_rgba(34,197,94,0.05)]',
    warning: 'bg-amber-50 text-amber-600 border-amber-200/50 shadow-[0_0_10px_rgba(245,158,11,0.05)]',
    error: 'bg-red-50 text-red-600 border-red-200/50 shadow-[0_0_10px_rgba(220,38,38,0.05)]',
    info: 'bg-indigo-50 text-indigo-600 border-indigo-200/50 shadow-[0_0_10px_rgba(79,70,229,0.05)]',
    neutral: 'bg-gray-50 text-gray-600 border-gray-200/50 shadow-[0_0_10px_rgba(107,114,128,0.05)]',
    primary: 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(var(--color-primary),0.05)]',
    terminal: 'bg-gray-950 text-primary border-primary/30 font-mono text-[10px] uppercase tracking-widest px-2 py-0',
  };

  const dots = {
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-indigo-500',
    neutral: 'bg-gray-500',
    primary: 'bg-primary',
    terminal: 'bg-primary animate-pulse',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-black uppercase tracking-wider border transition-all duration-300',
        size === 'sm' ? 'px-2 py-0.5 text-[8px]' : 'px-3 py-1 text-[10px]',
        variants[variant as keyof typeof variants],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', dots[variant as keyof typeof dots])} />
      )}
      {props.children}
    </span>
  );
};
