import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

export const Badge = ({ className, variant = 'neutral', ...props }: BadgeProps) => {
  // QA D20: dark variants for every status colour so badges remain readable
  // on dark surfaces.
  const variants = {
    success: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-900',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-900',
    error: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900',
    info: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
