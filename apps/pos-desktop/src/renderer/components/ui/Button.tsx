/**
 * Button Component - Design System
 * Red & White Theme
 */

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    // Base classes
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-fast ease-snappy focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
    
    // Variant classes
    const variantClasses = {
      primary: 'bg-primary-500 text-white shadow-button hover:bg-primary-600 hover:shadow-button-hover active:bg-primary-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
      secondary: 'bg-neutral-0 text-primary-600 border-2 border-primary-200 hover:bg-primary-50 hover:border-primary-300 active:bg-primary-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
      ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
      danger: 'bg-error-500 text-white shadow-sm hover:bg-error-600 hover:shadow-md active:bg-error-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    };

    // Size classes
    const sizeClasses = {
      sm: 'px-4 py-2 text-body-sm min-h-[36px]',
      md: 'px-6 py-3 text-body-md min-h-[48px]',
      lg: 'px-8 py-4 text-body-lg min-h-[56px]',
      xl: 'px-10 py-5 text-headline-sm min-h-[72px]',
    };

    // Full width
    const widthClass = fullWidth ? 'w-full' : '';

    // Combine classes
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`;

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className="w-5 h-5 animate-spin" />
        )}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

// Convenience exports for common button patterns
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> & { icon: React.ReactNode; label?: string }
>(({ icon, label, className = '', ...props }, ref) => (
  <button
    ref={ref}
    className={`inline-flex items-center justify-center p-2 rounded-lg transition-all duration-fast hover:bg-neutral-100 active:scale-95 active:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[40px] min-w-[40px] ${className}`}
    {...props}
  >
    {icon}
    {label && <span className="sr-only">{label}</span>}
  </button>
));
IconButton.displayName = 'IconButton';

export const CashierButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', ...props }, ref) => (
    <Button
      ref={ref}
      size="xl"
      className={`shadow-lg hover:shadow-xl ${className}`}
      {...props}
    />
  )
);
CashierButton.displayName = 'CashierButton';

export const CashierButtonSecondary = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', ...props }, ref) => (
    <Button
      ref={ref}
      variant="secondary"
      size="xl"
      className={`shadow-md hover:shadow-lg ${className}`}
      {...props}
    />
  )
);
CashierButtonSecondary.displayName = 'CashierButtonSecondary';
