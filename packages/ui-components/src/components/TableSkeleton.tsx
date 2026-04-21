import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  variant?: 'standard' | 'terminal';
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, cols = 5, variant = 'standard' }) => {
  return (
    <div className={cn(
      "w-full overflow-hidden rounded-[2.5rem] border mt-6 animate-pulse",
      variant === 'terminal' ? "bg-gray-950 border-primary/10" : "bg-white border-gray-100 shadow-sm"
    )}>
      <div className={cn(
        "h-20 border-b flex items-center px-10 gap-8",
        variant === 'terminal' ? "bg-white/5 border-primary/10" : "bg-gray-50 border-gray-100"
      )}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={cn(
            "h-3 rounded-full flex-1",
            variant === 'terminal' ? "bg-primary/10" : "bg-gray-200"
          )} />
        ))}
      </div>
      <div className={cn(
        "divide-y",
        variant === 'terminal' ? "divide-white/5" : "divide-gray-50"
      )}>
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="h-24 flex items-center px-10 gap-8">
            {Array.from({ length: cols }).map((_, col) => (
              <div key={col} className={cn(
                "h-2 rounded-full flex-1",
                variant === 'terminal' ? "bg-primary/5" : "bg-gray-100"
              )} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
