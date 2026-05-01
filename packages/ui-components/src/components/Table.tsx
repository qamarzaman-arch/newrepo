import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
  /** QA D19: optional caption for screen readers (e.g. "Today's orders"). */
  caption?: string;
}

export const Table = ({ className, headers, children, caption, ...props }: TableProps) => {
  return (
    <div className="w-full overflow-hidden bg-white dark:bg-neutral-900 rounded-3xl shadow-soft border border-gray-100 dark:border-neutral-800 mt-6">
      <div className="overflow-x-auto">
        <table className={cn('w-full text-left border-collapse', className)} {...props}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-100 dark:border-neutral-700">
              {headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-6 py-5 text-xs font-black text-gray-400 dark:text-neutral-300 uppercase tracking-widest"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-neutral-800">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TableRow = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('hover:bg-gray-50/50 dark:hover:bg-neutral-800/50 transition-colors', className)} {...props}>
    {children}
  </tr>
);

export const TableCell = ({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-6 py-5 text-sm text-gray-900 dark:text-neutral-100', className)} {...props}>
    {children}
  </td>
);
