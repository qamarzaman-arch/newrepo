/**
 * Badge Component - Design System
 * Red & White Theme
 */

import React, { forwardRef } from 'react';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'outline';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotPosition?: 'left' | 'right';
  children: React.ReactNode;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'neutral',
      size = 'md',
      dot = false,
      dotPosition = 'left',
      className = '',
      ...props
    },
    ref
  ) => {
    // Base classes
    const baseClasses = 'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap';
    
    // Variant classes
    const variantClasses = {
      primary: 'bg-primary-100 text-primary-700',
      success: 'bg-success-100 text-success-700',
      warning: 'bg-warning-100 text-warning-700',
      error: 'bg-error-100 text-error-700',
      neutral: 'bg-neutral-200 text-neutral-700',
      outline: 'bg-transparent border-2 border-current text-neutral-600',
    };

    // Size classes
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-label-sm',
      md: 'px-2.5 py-1 text-label-md',
    };

    // Dot color classes
    const dotColorClasses = {
      primary: 'bg-primary-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      error: 'bg-error-500',
      neutral: 'bg-neutral-500',
      outline: 'bg-current',
    };

    // Combine classes
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

    return (
      <span ref={ref} className={classes} {...props}>
        {dot && dotPosition === 'left' && (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColorClasses[variant]}`} />
        )}
        {children}
        {dot && dotPosition === 'right' && (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColorClasses[variant]}`} />
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
