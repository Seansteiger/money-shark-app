import React from 'react';
import { Customer, Loan, AppSettings, Repayment } from '../types';
import { calculateLoanDetails, formatCurrency, formatDate } from '../utils/calculations';
import { CustomerAvatar } from './CustomerAvatar';

interface DuplicateCustomerModalProps {
  isOpen: boolean;
  matchingCustomer: Customer | null;
  newLoanDetails: {
    principal: number;
    startDate: string;
    notes?: string;
  } | null;
  existingLoans: Loan[];
  repayments: Repayment[];
  settings: AppSettings;
  onConfirmAddToExisting: () => void;
  onConfirmCreateSeparate: () => void;
  onClose: () => void;
}

export const DuplicateCustomerModal: React.FC<DuplicateCustomerModalProps> = ({
  isOpen,
  matchingCustomer,
  newLoanDetails,
  existingLoans,
  repayments,
  settings,
  onConfirmAddToExisting,
  onConfirmCreateSeparate,
  onClose,
}) => {
  if (!isOpen || !matchingCustomer || !newLoanDetails) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-shark-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-shark-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-shark-800 bg-slate-50 dark:bg-shark-900/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
              👥
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Existing Profile Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-shark-400">
                A profile matching <strong>"{matchingCustomer.name}"</strong> already exists.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-shark-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-left">
          {/* Question Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
            <div className="font-bold text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-1.5">
              <span>💡</span>
              <span>Put this loan under the same profile?</span>
            </div>
            <p className="text-slate-600 dark:text-shark-300">
              You can organize both loans under <strong>{matchingCustomer.name}</strong>'s profile.
              Each loan will be treated <strong>completely separately with its own start date</strong>,
              its own monthly compounding cycle, and its own repayment ledger.
            </p>
          </div>

          {/* Existing Customer Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-shark-900 border border-slate-200 dark:border-shark-800 space-y-3">
            <div className="flex items-center gap-3.5">
              <CustomerAvatar customer={matchingCustomer} size="lg" />
              <div className="min-w-0">
                <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">
                  {matchingCustomer.name}
                </h4>
                {matchingCustomer.phone && (
                  <p className="text-xs text-slate-500 dark:text-shark-400">
                    Phone: {matchingCustomer.phone}
                  </p>
                )}
                {matchingCustomer.address && (
                  <p className="text-xs text-slate-500 dark:text-shark-400 truncate">
                    Address: {matchingCustomer.address}
                  </p>
                )}
              </div>
            </div>

            {/* List of currently logged loans for this customer */}
            <div className="pt-2 border-t border-slate-200 dark:border-shark-800 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-shark-500">
                Existing Loans on Profile ({existingLoans.length})
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {existingLoans.map((loan, idx) => {
                  const calc = calculateLoanDetails(
                    loan,
                    settings.globalInitialInterestRate,
                    settings.globalInterestRate,
                    repayments
                  );
                  return (
                    <div
                      key={loan.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-shark-800/80 border border-slate-200/80 dark:border-shark-700 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold font-mono text-slate-800 dark:text-slate-100">
                          Loan #{idx + 1}: {formatCurrency(loan.principal)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-shark-400">
                          Start Date: <strong>{formatDate(loan.startDate)}</strong>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            loan.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-200 dark:bg-shark-700 text-slate-600 dark:text-shark-300'
                          }`}
                        >
                          {loan.status}
                        </span>
                        <div className="text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                          Bal: {formatCurrency(calc.remainingBalance)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* New Loan Preview */}
          <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                ➕ New Loan Being Added
              </div>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(newLoanDetails.principal)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-shark-500">
                New Loan Start Date
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatDate(newLoanDetails.startDate)}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-6 border-t border-slate-200 dark:border-shark-800 bg-slate-50/50 dark:bg-shark-900/40 flex flex-col gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onConfirmAddToExisting}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-900/20 transition-all flex flex-col items-center justify-center cursor-pointer"
          >
            <span>✅ Yes, Put Under Same Profile</span>
            <span className="text-[11px] font-normal text-emerald-100 mt-0.5">
              Organized under {matchingCustomer.name} (keeps separate dates & balances)
            </span>
          </button>

          <button
            type="button"
            onClick={onConfirmCreateSeparate}
            className="w-full py-2.5 px-4 bg-white dark:bg-shark-800 hover:bg-slate-100 dark:hover:bg-shark-700 active:scale-[0.98] text-slate-700 dark:text-shark-200 border border-slate-200 dark:border-shark-700 rounded-2xl font-semibold text-xs transition-all flex flex-col items-center justify-center cursor-pointer"
          >
            <span>👤 No, Create as Separate Customer Profile</span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-shark-400 mt-0.5">
              Treat as a different person with the same name
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2 text-xs font-semibold text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-center"
          >
            Cancel and edit loan
          </button>
        </div>
      </div>
    </div>
  );
};
