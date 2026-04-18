import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
}

export const Table = ({ className, headers, children, ...props }: TableProps) => {
  return (
    <div className="w-full overflow-hidden bg-white rounded-3xl shadow-soft border border-gray-100 mt-6">
      <div className="overflow-x-auto">
        <table className={cn('w-full text-left border-collapse', className)} {...props}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TableRow = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('hover:bg-gray-50/50 transition-colors', className)} {...props}>
    {children}
  </tr>
);

export const TableCell = ({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-6 py-5 text-sm', className)} {...props}>
    {children}
  </td>
);
