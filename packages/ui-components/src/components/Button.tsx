import React, { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /** QA D17: required for icon-only buttons; recommended for all buttons. */
  'aria-label'?: string;
  children?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-container shadow-soft dark:bg-primary dark:text-white',
  secondary: 'bg-secondary text-white hover:bg-secondary-container shadow-soft dark:bg-secondary dark:text-white',
  outline: 'border-2 border-gray-200 bg-transparent hover:border-primary hover:text-primary dark:border-neutral-700 dark:text-neutral-100',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-soft',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 dark:text-neutral-200 dark:hover:bg-neutral-800',
};
const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-4 text-base font-bold',
  icon: 'p-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    // QA D21: fall back to 'primary' silently rather than producing undefined classes.
    const variantClass = VARIANTS[variant] || VARIANTS.primary;
    const sizeClass = SIZES[size] || SIZES.md;
    // QA D17: aria-busy must reflect loading state for screen readers.
    const ariaBusy = isLoading ? true : undefined;

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all',
          'disabled:opacity-50 disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          variantClass,
          sizeClass,
          className
        )}
        disabled={isLoading || disabled}
        aria-busy={ariaBusy}
        {...props}
      >
        {isLoading ? (
          <span
            role="status"
            aria-label="Loading"
            className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
