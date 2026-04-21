import React from 'react';
import { Printer, Download, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReceiptPreviewProps {
  receiptText: string;
  onClose: () => void;
  onPrint?: () => void;
}

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ receiptText, onClose, onPrint }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">Receipt Preview</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
          <div className="bg-white p-6 shadow-sm border border-gray-200 font-mono text-xs whitespace-pre leading-relaxed mx-auto max-w-[300px]">
            {receiptText}
            <div className="mt-8 border-t border-dashed border-gray-300 pt-4 flex flex-col items-center gap-2">
               <div className="w-16 h-16 bg-gray-50 border-2 border-gray-100 rounded-lg flex items-center justify-center">
                 <span className="text-[10px] text-gray-300 font-bold uppercase">QR CODE</span>
               </div>
               <span className="text-[8px] text-gray-400">Scan for digital copy</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100 flex gap-3">
          <button
            onClick={onPrint}
            className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <Printer className="w-4 h-4" />
            Send to Printer
          </button>
          <button className="p-4 bg-gray-50 text-gray-700 rounded-2xl border border-gray-200 hover:bg-gray-100 transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ReceiptPreview;
