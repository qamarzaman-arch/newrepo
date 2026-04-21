import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
  variant?: 'standard' | 'terminal';
}

export const Table = ({ className, headers, variant = 'standard', children, ...props }: TableProps) => {
  return (
    <div className={cn(
      "w-full overflow-hidden rounded-[2.5rem] border mt-6",
      variant === 'terminal' ? "bg-gray-950 border-primary/10" : "bg-white border-gray-100 shadow-sm"
    )}>
      <div className="overflow-x-auto custom-scrollbar">
        <table className={cn('w-full text-left border-collapse', className)} {...props}>
          <thead>
            <tr className={cn(
              "border-b",
              variant === 'terminal' ? "bg-white/5 border-primary/10" : "bg-gray-50 border-gray-100"
            )}>
              {headers.map((header) => (
                <th
                  key={header}
                  className={cn(
                    "px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]",
                    variant === 'terminal' ? "text-primary/70" : "text-gray-400"
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn(
            "divide-y",
            variant === 'terminal' ? "divide-white/5" : "divide-gray-50"
          )}>
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TableRow = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('hover:bg-gray-50/50 transition-all duration-300 group', className)} {...props}>
    {children}
  </tr>
);

export const TableCell = ({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-8 py-6 text-sm font-medium text-gray-600 group-hover:text-gray-900', className)} {...props}>
    {children}
  </td>
);
