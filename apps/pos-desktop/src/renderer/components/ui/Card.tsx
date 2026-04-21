/**
 * Card Component - Design System
 * Red & White Theme
 */

import React, { forwardRef } from 'react';

export type CardVariant = 'default' | 'flat' | 'highlight' | 'outlined';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
  hover?: boolean;
  children: React.ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      shadow = true,
      hover = false,
      className = '',
      ...props
    },
    ref
  ) => {
    // Base classes
    const baseClasses = 'rounded-xl transition-all duration-normal ease-smooth overflow-hidden';
    
    // Variant classes
    const variantClasses = {
      default: `${shadow ? 'shadow-card' : ''} bg-neutral-0 border border-neutral-200 ${hover ? 'hover:shadow-card-hover hover:border-neutral-300' : ''}`,
      flat: 'bg-neutral-50 border border-neutral-200',
      highlight: 'bg-primary-50 border-2 border-primary-200',
      outlined: 'bg-neutral-0 border-2 border-primary-300',
    };

    // Padding classes
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-8',
    };

    // Combine classes
    const classes = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;

// Card Header component
export const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { title?: string; subtitle?: string; action?: React.ReactNode }
>(({ title, subtitle, action, children, className = '', ...props }, ref) => (
  <div ref={ref} className={`flex items-start justify-between gap-4 mb-4 ${className}`} {...props}>
    <div className="flex-1 min-w-0">
      {title && <h3 className="text-headline-sm font-semibold text-neutral-900 truncate">{title}</h3>}
      {subtitle && <p className="text-body-sm text-neutral-600 mt-1">{subtitle}</p>}
      {children}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
));
CardHeader.displayName = 'CardHeader';

// Card Content component
export const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`${className}`} {...props} />
));
CardContent.displayName = 'CardContent';

// Card Footer component
export const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`flex items-center justify-end gap-3 mt-4 pt-4 border-t border-neutral-200 ${className}`} {...props} />
));
CardFooter.displayName = 'CardFooter';
