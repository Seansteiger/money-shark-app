import React, { useState, useEffect } from 'react';
import { EXPENSE_CATEGORIES } from '../utils/monthlyCalculations';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (data: {
    amount: number;
    category: string;
    date: string;
    notes?: string;
  }) => Promise<void>;
  initialDate?: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  initialDate,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('TRANSPORT');
  const [date, setDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setCategory('TRANSPORT');
      setDate(initialDate || new Date().toISOString().split('T')[0]);
      setNotes('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter an expense amount greater than zero.');
      return;
    }

    if (!date) {
      setErrorMessage('Please select a valid date for this expense.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSaveExpense({
        amount: numAmount,
        category,
        date,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-shark-900 rounded-3xl border border-slate-200 dark:border-shark-750 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-money-500" />

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-shark-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shadow-sm border border-amber-500/20">
              💸
            </div>
            <div>
              <h3 id="expense-modal-title" className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Log Business Expense
              </h3>
              <p className="text-xs text-slate-500 dark:text-shark-400 mt-0.5">
                Record operational costs, fuel, airtime, or administrative expenditures.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-shark-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-shark-400 uppercase tracking-wider mb-1.5">
              Expense Amount (ZAR) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-shark-400 font-mono text-sm font-bold">
                R
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-shark-950 border border-slate-200 dark:border-shark-700 rounded-xl text-slate-900 dark:text-white font-mono text-base font-bold focus:border-money-500 focus:ring-2 focus:ring-money-500/20 outline-none transition-colors"
                autoFocus
                required
              />
            </div>

            {/* Quick Amount Pills */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {[50, 100, 200, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-shark-800 dark:hover:bg-shark-700 text-slate-700 dark:text-shark-300 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
                >
                  R{val}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-shark-400 uppercase tracking-wider mb-1.5">
              Expense Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-money-50 dark:bg-money-900/20 border-money-500 ring-1 ring-money-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-shark-950/60 border-slate-200 dark:border-shark-800 hover:border-slate-300 dark:hover:border-shark-700'
                    }`}
                  >
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-shark-400 uppercase tracking-wider mb-1.5">
              Expense Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-shark-950 border border-slate-200 dark:border-shark-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-money-500 focus:ring-2 focus:ring-money-500/20 outline-none transition-colors"
              required
            />
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-shark-400 uppercase tracking-wider mb-1.5">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Fuel to visit client in Zone 4, or Airtime bundle..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-shark-950 border border-slate-200 dark:border-shark-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-money-500 focus:ring-2 focus:ring-money-500/20 outline-none transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-shark-800 dark:hover:bg-shark-700 text-slate-700 dark:text-shark-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-money-600 hover:bg-money-500 active:bg-money-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-money-900/20 cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Save Expense</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
