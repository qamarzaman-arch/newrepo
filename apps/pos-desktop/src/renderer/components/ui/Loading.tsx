/**
 * Loading Components - Design System
 * Skeleton loaders, spinners, and loading states
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

// Spinner component
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'neutral';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  color = 'primary',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorClasses = {
    primary: 'text-primary-500',
    white: 'text-white',
    neutral: 'text-neutral-400',
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`} />
  );
};

// Full page loading
export const FullPageLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 bg-neutral-0/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
    <Spinner size="xl" />
    <p className="text-body-lg text-neutral-600 animate-pulse">{message}</p>
  </div>
);

// Skeleton component
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '1rem',
  circle = false,
  className = '' 
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div 
      className={`bg-neutral-200 animate-pulse ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`}
      style={style}
    />
  );
};

// Card skeleton
export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="p-5 rounded-xl border border-neutral-200 bg-neutral-0 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton width={40} height={40} circle />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} />
      </div>
    </div>
    {lines > 0 && (
      <div className="space-y-2 pt-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={12} />
        ))}
      </div>
    )}
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="rounded-xl border border-neutral-200 bg-neutral-0 overflow-hidden">
    {/* Header */}
    <div className="grid gap-4 p-4 bg-neutral-50 border-b border-neutral-200">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={16} />
        ))}
      </div>
    </div>
    {/* Rows */}
    <div className="divide-y divide-neutral-200">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-4 p-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height={16} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Order item skeleton (for POS)
export const OrderItemSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-neutral-200 bg-neutral-0">
        <Skeleton width={64} height={64} circle />
        <div className="flex-1 space-y-2">
          <Skeleton width="70%" height={18} />
          <Skeleton width="40%" height={14} />
        </div>
        <div className="text-right space-y-2">
          <Skeleton width={80} height={20} />
          <Skeleton width={60} height={14} />
        </div>
      </div>
    ))}
  </div>
);

// Menu grid skeleton
export const MenuGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-4 rounded-xl border border-neutral-200 bg-neutral-0 space-y-3">
        <Skeleton height={120} className="rounded-lg" />
        <Skeleton width="80%" height={18} />
        <div className="flex items-center justify-between">
          <Skeleton width={60} height={20} />
          <Skeleton width={40} height={36} />
        </div>
      </div>
    ))}
  </div>
);

// Button loading state
export const ButtonLoading: React.FC<{ children?: React.ReactNode }> = ({ 
  children = 'Loading...' 
}) => (
  <div className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-100 text-primary-600 font-semibold rounded-lg">
    <Spinner size="sm" />
    {children}
  </div>
);

// Empty state
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon, 
  title, 
  description,
  action 
}) => (
  <div className="flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
    {icon && (
      <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4 text-neutral-400">
        {icon}
      </div>
    )}
    <h3 className="text-headline-sm font-semibold text-neutral-900 mb-2">{title}</h3>
    {description && <p className="text-body-md text-neutral-600 max-w-sm mb-6">{description}</p>}
    {action}
  </div>
);

// Error state
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  title = 'Something went wrong',
  message,
  onRetry 
}) => (
  <div className="flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
    <div className="w-16 h-16 rounded-full bg-error-100 flex items-center justify-center mb-4">
      <span className="text-2xl">⚠️</span>
    </div>
    <h3 className="text-headline-sm font-semibold text-neutral-900 mb-2">{title}</h3>
    <p className="text-body-md text-neutral-600 max-w-sm mb-6">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="btn-primary"
      >
        Try Again
      </button>
    )}
  </div>
);
