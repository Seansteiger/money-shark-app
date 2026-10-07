import React, { useState, useEffect, useMemo } from 'react';
import { Loan, Customer, Repayment } from '../types';
import { LoanCalculations, formatCurrency, formatDate } from '../utils/calculations';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  customer: Customer | null;
  calculations: LoanCalculations | null;
  repayments: Repayment[];
  initialMode?: 'FULL' | 'HALF' | 'CUSTOM';
  onRecordPayment: (data: {
    loanId: string;
    amount: number;
    paymentDate: string;
    notes: string;
  }) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  loan,
  customer,
  calculations,
  repayments,
  initialMode = 'CUSTOM',
  onRecordPayment,
  onDeletePayment,
}) => {
  if (!isOpen || !loan || !calculations) return null;

  const [paymentMode, setPaymentMode] = useState<'FULL' | 'HALF' | 'CUSTOM'>(initialMode);
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'record' | 'history'>('record');

  const loanRepayments = repayments.filter((r) => r.loanId === loan.id);
  const remaining = calculations.remainingBalance;
  const baseHalf = calculations.baseHalfAmount;
  const alreadyRepaid = calculations.totalRepaid;

  // Compute exact half payment amount
  const computedHalfAmount = useMemo(() => {
    if (remaining <= 0) return 0;
    if (alreadyRepaid <= 0.05) {
      // 1st half: 50% of initial gross debt
      return Math.min(remaining, baseHalf);
    }
    if (alreadyRepaid < baseHalf) {
      // Amount required to complete the 1st half
      return Math.min(remaining, Math.round((baseHalf - alreadyRepaid) * 100) / 100);
    }
    // 1st half was already settled; 2nd half is the entire remaining balance
    return remaining;
  }, [remaining, baseHalf, alreadyRepaid]);

  // Handle mode selection
  const selectPaymentMode = (mode: 'FULL' | 'HALF' | 'CUSTOM') => {
    setPaymentMode(mode);
    setErrorMessage('');
    if (mode === 'FULL') {
      setAmount(remaining.toFixed(2));
      setNotes('Paid in Full (Full settlement)');
    } else if (mode === 'HALF') {
      setAmount(computedHalfAmount.toFixed(2));
      if (alreadyRepaid >= baseHalf - 0.05) {
        setNotes('Half payment (2nd installment - settlement)');
      } else {
        setNotes('Half payment (1st installment - 50%)');
      }
    } else {
      setAmount('');
      setNotes('');
    }
  };

  // Sync initial mode when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialMode === 'HALF') {
        selectPaymentMode('HALF');
      } else if (initialMode === 'FULL') {
        selectPaymentMode('FULL');
      } else {
        setPaymentMode('CUSTOM');
        setAmount('');
        setNotes('');
      }
    }
  }, [isOpen, initialMode, loan.id]);

  const handleQuickAmount = (val: number) => {
    setAmount(val.toFixed(2));
    setErrorMessage('');
  };

  const payingNum = parseFloat(amount) || 0;
  const projectedBalance = Math.max(0, Math.round((remaining - payingNum) * 100) / 100);
  const projectedRepaid = calculations.totalRepaid + payingNum;
  const projectedProgress = calculations.totalAmount > 0 
    ? Math.min(100, Math.max(0, Math.round((projectedRepaid / calculations.totalAmount) * 100))) 
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (remaining <= 0.01) {
      setErrorMessage('This loan is already fully settled.');
      return;
    }

    if (numAmount > remaining + 0.01) {
      setErrorMessage(`Payment amount cannot exceed remaining balance of ${formatCurrency(remaining)}.`);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await onRecordPayment({
        loanId: loan.id,
        amount: numAmount,
        paymentDate,
        notes: notes.trim(),
      });
      setAmount('');
      setNotes('');
      // Switch to history to view newly logged transaction
      setActiveTab('history');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Are you sure you want to remove this transaction entry? The loan balance will be restored.')) {
      return;
    }
    setDeletingId(paymentId);
    try {
      await onDeletePayment(paymentId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white dark:bg-shark-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-shark-800 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-shark-800 bg-slate-50 dark:bg-shark-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Log Loan Installment
              </h3>
              <p className="text-xs text-slate-500 dark:text-shark-400">
                Borrower: <strong className="text-slate-700 dark:text-shark-200">{customer?.name || 'Customer'}</strong>
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

        {/* 7-Day Grace Period Protection Banner */}
        {calculations.isInGracePeriod && (
          <div className="px-6 py-2.5 bg-emerald-500/10 dark:bg-emerald-950/40 border-b border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <div>
                <strong>7-Day Grace Period Active:</strong>{' '}
                <span>{calculations.graceDaysRemaining} day{calculations.graceDaysRemaining === 1 ? '' : 's'} remaining to pay without extra interest.</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 font-bold shrink-0">
              Grace Active
            </span>
          </div>
        )}

        {/* Balance Overview Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-shark-900 to-shark-950 text-white border-b border-shark-800 shrink-0">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-shark-400">Gross Debt</div>
              <div className="text-sm sm:text-base font-bold font-mono mt-0.5">{formatCurrency(calculations.totalAmount)}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400">Total Repaid</div>
              <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-0.5">
                {formatCurrency(calculations.totalRepaid)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-shark-300">Remaining</div>
              <div className={`text-sm sm:text-base font-bold font-mono mt-0.5 ${remaining <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {formatCurrency(remaining)}
              </div>
            </div>
          </div>

          {/* Repayment Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-shark-400 mb-1">
              <span>Repayment Progress</span>
              <span className="font-semibold text-white">
                {calculations.repaymentProgress}% Settled {calculations.isHalfPaid && '• 🌓 1st Half Paid'}
              </span>
            </div>
            <div className="w-full h-2 bg-shark-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${calculations.repaymentProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-shark-800 bg-slate-100/50 dark:bg-shark-900/40 px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'record'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-shark-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            + Log Transaction
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-shark-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span>Transaction History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-shark-800 text-slate-700 dark:text-shark-300">
              {loanRepayments.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {activeTab === 'record' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Payment Mode Selector */}
              {remaining > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-shark-400 uppercase mb-1.5">
                    Select Payment Type
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-shark-900 rounded-2xl border border-slate-200 dark:border-shark-800">
                    <button
                      type="button"
                      onClick={() => selectPaymentMode('HALF')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'HALF'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-600 dark:text-shark-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>🌓</span>
                      <span>Pay in Halves (50%)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectPaymentMode('FULL')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'FULL'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-600 dark:text-shark-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>🏁</span>
                      <span>Full Settlement</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectPaymentMode('CUSTOM')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'CUSTOM'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-600 dark:text-shark-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>✏️</span>
                      <span>Custom Amount</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Half-Payment Informative Banner */}
              {paymentMode === 'HALF' && remaining > 0 && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🌓</span>
                    <div>
                      <strong className="block text-slate-900 dark:text-white">
                        {alreadyRepaid >= baseHalf - 0.05 ? '2nd Half / Final Settlement' : '1st Half Installment (50%)'}
                      </strong>
                      <span className="text-[11px] text-slate-600 dark:text-shark-300">
                        {alreadyRepaid >= baseHalf - 0.05
                          ? '1st half was already settled. This payment clears the remaining balance.'
                          : `Pays half (${formatCurrency(computedHalfAmount)}) of the ${formatCurrency(calculations.totalAmount)} total debt.`}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm shrink-0 text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(computedHalfAmount)}
                  </span>
                </div>
              )}

              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-shark-400 uppercase mb-1.5">
                  Amount Received (ZAR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-shark-500">
                    R
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={remaining > 0 ? remaining : undefined}
                    disabled={remaining <= 0.01}
                    required
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setPaymentMode('CUSTOM');
                    }}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-lg focus:border-emerald-500 outline-none transition-colors disabled:opacity-50"
                  />
                </div>

                {/* Quick Presets for Custom mode */}
                {paymentMode === 'CUSTOM' && remaining > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        selectPaymentMode('HALF');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <span>🌓</span> Pay Half ({formatCurrency(computedHalfAmount)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        selectPaymentMode('FULL');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-shark-800 hover:bg-slate-200 dark:hover:bg-shark-700 text-slate-600 dark:text-shark-300 border border-slate-200 dark:border-shark-700 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <span>🏁</span> Pay Full ({formatCurrency(remaining)})
                    </button>
                    {[100, 250, 500].filter((val) => val < remaining).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickAmount(val)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-shark-800 hover:bg-slate-200 dark:hover:bg-shark-700 text-slate-600 dark:text-shark-300 border border-slate-200 dark:border-shark-700 transition-all active:scale-95 cursor-pointer"
                      >
                        +{formatCurrency(val)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Settlement Balance Preview Box */}
              {payingNum > 0 && (
                <div className="p-3.5 bg-slate-50 dark:bg-shark-900/80 border border-slate-200 dark:border-shark-800 rounded-2xl space-y-1.5 text-xs animate-in fade-in duration-150">
                  <div className="flex justify-between items-center text-slate-600 dark:text-shark-300">
                    <span>Payment to Record:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(payingNum)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-shark-300">
                    <span>Balance After Payment:</span>
                    <span className={`font-mono font-bold ${projectedBalance <= 0.01 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                      {formatCurrency(projectedBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-shark-300 pt-1.5 border-t border-slate-200 dark:border-shark-800">
                    <span>Status After Payment:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      {projectedBalance <= 0.01 ? (
                        <span>🎉 100% Fully Settled (Paid in Full)</span>
                      ) : projectedRepaid >= baseHalf - 0.05 ? (
                        <span>🌓 1st Half Complete ({projectedProgress}% Settled)</span>
                      ) : (
                        <span>{projectedProgress}% Settled</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Transaction Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-shark-400 uppercase mb-1.5">
                  Transaction Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-emerald-500 outline-none transition-colors"
                />
              </div>

              {/* Notes / Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-shark-400 uppercase mb-1.5">
                  Notes / Transaction Reference
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Half payment, cash installment, bank ref"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-emerald-500 outline-none transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-shark-300 hover:bg-slate-100 dark:hover:bg-shark-800 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || payingNum <= 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Logging...</span>
                  ) : (
                    <>
                      <span>Save Transaction</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              {loanRepayments.length === 0 ? (
                loan.status === 'PAID' ? (
                  <div className="text-center py-10 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 p-6 space-y-2">
                    <div className="text-3xl mb-1">✓</div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Settled in Full</p>
                    <p className="text-xs text-slate-500 dark:text-shark-400">
                      Total debt of {formatCurrency(calculations.totalAmount)} was marked as paid and closed.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 dark:text-shark-500 bg-slate-50 dark:bg-shark-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-shark-800">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-shark-300">No installments logged yet</p>
                    <p className="text-xs text-slate-500 dark:text-shark-500 mt-1">
                      Use the "+ Log Transaction" tab to record customer payments.
                    </p>
                  </div>
                )
              ) : (
                <div className="space-y-2.5">
                  {loanRepayments.map((item) => {
                    const isHalfNote = item.notes?.toLowerCase().includes('half');
                    const isFullNote = item.notes?.toLowerCase().includes('full') || item.notes?.toLowerCase().includes('settle');

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-shark-900 border border-slate-200 dark:border-shark-800 flex items-center justify-between gap-3 hover:border-emerald-500/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                            {isHalfNote ? '🌓' : '✓'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                +{formatCurrency(item.amount)}
                              </span>
                              {isHalfNote && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Half Payment
                                </span>
                              )}
                              {isFullNote && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  Full Settlement
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-shark-400 mt-0.5 truncate">
                              Logged on {formatDate(item.paymentDate)}
                              {item.notes && <span> • "{item.notes}"</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
                          title="Undo transaction entry"
                        >
                          {deletingId === item.id ? (
                            <span className="text-xs">...</span>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
