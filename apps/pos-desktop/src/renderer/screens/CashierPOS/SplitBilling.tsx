import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Users, DollarSign, CreditCard, Wallet } from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';
import { useCurrencyFormatter } from '../../hooks/useCurrency';
import toast from 'react-hot-toast';

interface SplitOption {
  id: string;
  type: 'EQUAL' | 'CUSTOM' | 'PER_ITEM';
  name: string;
  description: string;
}

const SPLIT_OPTIONS: SplitOption[] = [
  {
    id: 'EQUAL',
    type: 'EQUAL',
    name: 'Equal Split',
    description: 'Divide total equally among guests',
  },
  {
    id: 'CUSTOM',
    type: 'CUSTOM',
    name: 'Custom Amounts',
    description: 'Specify amount per person',
  },
  {
    id: 'PER_ITEM',
    type: 'PER_ITEM',
    name: 'Per Item',
    description: 'Split by items ordered',
  },
];

interface SplitPerson {
  id: string;
  name: string;
  amount: number;
  items: string[]; // item IDs assigned to this person
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (splits: Array<{ method: string; amount: number }>) => void;
  totalAmount: number;
}

const SplitBilling: React.FC<Props> = ({ isOpen, onClose, onConfirm, totalAmount }) => {
  const { formatCurrency } = useCurrencyFormatter();
  const { currentOrder } = useOrderStore();
  
  const [selectedOption, setSelectedOption] = useState<SplitOption | null>(null);
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const [customSplits, setCustomSplits] = useState<SplitPerson[]>([]);
  const [itemAssignments, setItemAssignments] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSelectOption = (option: SplitOption) => {
    setSelectedOption(option);
    
    if (option.type === 'EQUAL') {
      const equalAmount = totalAmount / numberOfPeople;
      setCustomSplits(
        Array.from({ length: numberOfPeople }, (_, i) => ({
          id: `person-${i}`,
          name: `Person ${i + 1}`,
          amount: equalAmount,
          items: [],
        }))
      );
    } else if (option.type === 'CUSTOM') {
      setCustomSplits(
        Array.from({ length: numberOfPeople }, (_, i) => ({
          id: `person-${i}`,
          name: `Person ${i + 1}`,
          amount: 0,
          items: [],
        }))
      );
    } else if (option.type === 'PER_ITEM') {
      // Initialize with empty item assignments
      setCustomSplits(
        Array.from({ length: numberOfPeople }, (_, i) => ({
          id: `person-${i}`,
          name: `Person ${i + 1}`,
          amount: 0,
          items: [],
        }))
      );
    }
  };

  const handlePeopleChange = (delta: number) => {
    const newCount = Math.max(2, Math.min(20, numberOfPeople + delta));
    setNumberOfPeople(newCount);
    
    if (selectedOption) {
      handleSelectOption(selectedOption);
    }
  };

  const handleCustomAmountChange = (personId: string, amount: number) => {
    setCustomSplits(splits =>
      splits.map(split =>
        split.id === personId ? { ...split, amount } : split
      )
    );
  };

  const handleItemAssignment = (itemId: string, personId: string) => {
    setItemAssignments(prev => ({ ...prev, [itemId]: personId }));
    
    // Recalculate amounts based on item assignments
    if (selectedOption?.type === 'PER_ITEM') {
      const personTotals: Record<string, number> = {};
      
      currentOrder.items.forEach(item => {
        const assignedPersonId = itemAssignments[item.id] || personId;
        if (!personTotals[assignedPersonId]) {
          personTotals[assignedPersonId] = 0;
        }
        personTotals[assignedPersonId] += item.price * item.quantity;
      });
      
      setCustomSplits(splits =>
        splits.map(split => ({
          ...split,
          amount: personTotals[split.id] || 0,
          items: currentOrder.items
            .filter(item => itemAssignments[item.id] === split.id)
            .map(item => item.id),
        }))
      );
    }
  };

  const totalSplitAmount = customSplits.reduce((sum, split) => sum + split.amount, 0);
  const isBalanced = Math.abs(totalSplitAmount - totalAmount) < 0.01;

  const handleConfirm = () => {
    if (!isBalanced) {
      toast.error(`Split amounts (${formatCurrency(totalSplitAmount)}) do not match total (${formatCurrency(totalAmount)})`);
      return;
    }
    
    const splitPayments = customSplits.map(split => ({
      method: 'SPLIT',
      amount: split.amount,
    }));
    
    onConfirm(splitPayments);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-600 px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Split Bill</h2>
                <p className="text-white/80 text-sm mt-1">
                  Total: {formatCurrency(totalAmount)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
              {!selectedOption ? (
                /* Split Options */
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Choose Split Method</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {SPLIT_OPTIONS.map((option) => (
                      <motion.button
                        key={option.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectOption(option)}
                        className="p-6 bg-gray-50 hover:bg-primary/5 border-2 border-gray-200 hover:border-primary rounded-2xl text-left transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-primary" />
                          </div>
                          <h4 className="font-bold text-gray-900">{option.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Split Details */
                <div className="space-y-6">
                  {/* Back Button */}
                  <button
                    onClick={() => setSelectedOption(null)}
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    ← Back to options
                  </button>

                  {/* Number of People (for EQUAL and CUSTOM) */}
                  {selectedOption.type !== 'PER_ITEM' && (
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <label className="text-sm font-semibold text-gray-700 mb-3 block">
                        Number of People
                      </label>
                      <div className="flex items-center gap-4">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handlePeopleChange(-1)}
                          disabled={numberOfPeople <= 2}
                          className="w-12 h-12 bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <Minus className="w-5 h-5 text-gray-700" />
                        </motion.button>
                        <div className="w-20 h-12 bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-900">{numberOfPeople}</span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handlePeopleChange(1)}
                          disabled={numberOfPeople >= 20}
                          className="w-12 h-12 bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <Plus className="w-5 h-5 text-gray-700" />
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* Per Item Assignment */}
                  {selectedOption.type === 'PER_ITEM' && (
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <h4 className="font-bold text-gray-900 mb-4">Assign Items to People</h4>
                      <div className="space-y-3">
                        {currentOrder.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{item.name}</p>
                              <p className="text-sm text-gray-600">
                                {item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.price * item.quantity)}
                              </p>
                            </div>
                            <select
                              value={itemAssignments[item.id] || ''}
                              onChange={(e) => handleItemAssignment(item.id, e.target.value)}
                              className="ml-4 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="">Select Person</option>
                              {customSplits.map((split) => (
                                <option key={split.id} value={split.id}>
                                  {split.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Split Details */}
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h4 className="font-bold text-gray-900 mb-4">Split Details</h4>
                    <div className="space-y-3">
                      {customSplits.map((split, index) => (
                        <div key={split.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={split.name}
                              onChange={(e) =>
                                setCustomSplits(splits =>
                                  splits.map(s =>
                                    s.id === split.id ? { ...s, name: e.target.value } : s
                                  )
                                )
                              }
                              className="font-semibold text-gray-900 bg-transparent border-none focus:outline-none"
                            />
                          </div>
                          {selectedOption.type === 'CUSTOM' && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                value={split.amount}
                                onChange={(e) =>
                                  handleCustomAmountChange(split.id, Number(e.target.value))
                                }
                                className="w-24 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-right"
                                step="0.01"
                              />
                            </div>
                          )}
                          {selectedOption.type !== 'CUSTOM' && (
                            <div className="font-bold text-gray-900">
                              {formatCurrency(split.amount)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Balance Check */}
                  <div className={`p-4 rounded-xl ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">Total Split:</span>
                      <span className={`font-bold ${isBalanced ? 'text-green-600' : 'text-amber-600'}`}>
                        {formatCurrency(totalSplitAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-semibold text-gray-700">Order Total:</span>
                      <span className="font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
                    </div>
                    {!isBalanced && (
                      <div className="mt-2 text-sm text-amber-700">
                        Difference: {formatCurrency(Math.abs(totalSplitAmount - totalAmount))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-8 py-6 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                {selectedOption ? `${customSplits.length} people selected` : 'Choose a split method above'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                {selectedOption && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirm}
                    disabled={!isBalanced}
                    className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Split
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplitBilling;
