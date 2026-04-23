/**
 * Input Component - Design System
 * Red & White Theme
 */

import React, { forwardRef } from 'react';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'error' | 'success';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  size?: InputSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  isPassword?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      success = false,
      size = 'md',
      leftIcon,
      rightIcon,
      fullWidth = true,
      isPassword = false,
      disabled,
      className = '',
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);

    // Determine input type for password toggle
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    // Base classes
    const baseClasses = 'w-full bg-neutral-0 text-neutral-900 placeholder:text-neutral-500 rounded-lg transition-all duration-fast ease-snappy focus:outline-none focus:ring-0 disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed';
    
    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-2 text-body-sm min-h-[36px]',
      md: 'px-4 py-3 text-body-md min-h-[48px]',
      lg: 'px-5 py-4 text-body-lg min-h-[56px]',
    };

    // Variant classes (border color)
    const variantClasses = {
      default: 'border-2 border-neutral-300 hover:border-neutral-400 focus:border-primary-500',
      error: 'border-2 border-error-500 focus:border-error-500 bg-error-50',
      success: 'border-2 border-success-500 focus:border-success-500 bg-success-50',
    };

    // Icon padding
    const iconPaddingClasses = {
      sm: leftIcon ? 'pl-10' : '',
      md: leftIcon ? 'pl-11' : '',
      lg: leftIcon ? 'pl-12' : '',
    };

    const rightIconPaddingClasses = {
      sm: (rightIcon || isPassword || success) ? 'pr-10' : '',
      md: (rightIcon || isPassword || success) ? 'pr-11' : '',
      lg: (rightIcon || isPassword || success) ? 'pr-12' : '',
    };

    // Determine variant
    let variant: InputVariant = 'default';
    if (error) variant = 'error';
    else if (success) variant = 'success';

    // Combine classes
    const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${iconPaddingClasses[size]} ${rightIconPaddingClasses[size]} ${className}`;

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <div className={`${widthClass}`}>
        {label && (
          <label className="block text-label-md font-medium text-neutral-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={classes}
            disabled={disabled}
            {...props}
          />
          {/* Right icons container */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {success && !error && (
              <Check className="w-5 h-5 text-success-500" />
            )}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-neutral-500 hover:text-neutral-700 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
            {rightIcon && !isPassword && (
              <div className="text-neutral-500">
                {rightIcon}
              </div>
            )}
          </div>
        </div>
        {/* Helper or error text */}
        {(helperText || error) && (
          <div className="mt-1.5 flex items-start gap-1.5">
            {error && <AlertCircle className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" />}
            <p className={`text-body-sm ${error ? 'text-error-600' : 'text-neutral-600'}`}>
              {error || helperText}
            </p>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
