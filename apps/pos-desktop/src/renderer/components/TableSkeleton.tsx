import React from 'react';

const TableSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-white rounded-3xl overflow-hidden border border-gray-100 animate-pulse">
      <div className="h-16 bg-gray-50 border-b border-gray-100 flex items-center px-8 gap-4">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-4 bg-gray-200 rounded-full flex-1" />)}
      </div>
      <div className="divide-y divide-gray-50">
        {[1, 2, 3, 4, 5].map(row => (
          <div key={row} className="h-20 flex items-center px-8 gap-4">
            {[1, 2, 3, 4, 5].map(col => <div key={col} className="h-3 bg-gray-100 rounded-full flex-1" />)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSkeleton;
