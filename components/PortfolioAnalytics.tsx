import React, { useState } from 'react';
import { Loan, Customer, Repayment, AppSettings } from '../types';
import { calculateLoanDetails, formatCurrency } from '../utils/calculations';

interface PortfolioAnalyticsProps {
  loans: Loan[];
  customers: Customer[];
  repayments: Repayment[];
  settings: AppSettings;
  onExportCsv: () => void;
}

export const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({
  loans,
  customers,
  repayments,
  settings,
  onExportCsv,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const paidLoans = loans.filter((l) => l.status === 'PAID');

  let totalPrincipal = 0;
  let totalAccruedInterest = 0;
  let totalGrossDebt = 0;
  let totalRepaid = 0;
  let totalRemainingActive = 0;

  let gracePeriodCount = 0;
  let gracePeriodValue = 0;

  let compoundingCount = 0;
  let compoundingValue = 0;

  let overdueCount = 0;
  let overdueValue = 0;

  loans.forEach((loan) => {
    const calc = calculateLoanDetails(
      loan,
      settings.globalInitialInterestRate,
      settings.globalInterestRate,
      repayments
    );

    totalPrincipal += loan.principal;
    totalAccruedInterest += calc.interestAccrued;
    totalGrossDebt += calc.totalAmount;
    totalRepaid += calc.totalRepaid;

    if (loan.status === 'ACTIVE') {
      totalRemainingActive += calc.remainingBalance;

      if (calc.riskCategory === 'GRACE_PERIOD') {
        gracePeriodCount++;
        gracePeriodValue += calc.remainingBalance;
      } else if (calc.riskCategory === 'COMPOUNDING_1') {
        compoundingCount++;
        compoundingValue += calc.remainingBalance;
      } else {
        overdueCount++;
        overdueValue += calc.remainingBalance;
      }
    }
  });

  const recoveryRate = totalGrossDebt > 0 
    ? Math.min(100, Math.round((totalRepaid / totalGrossDebt) * 100))
    : 0;

  return (
    <div className="bg-white dark:bg-shark-800 rounded-3xl border border-slate-200 dark:border-shark-700 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all duration-300">
      {/* Top Banner Header */}
      <div className="p-5 md:p-6 border-b border-slate-100 dark:border-shark-700/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Capital Portfolio & Cashflow Analytics
          </h3>
          <p className="text-xs text-slate-500 dark:text-shark-400 mt-0.5">
            Real-time capital deployment, repayment velocity, and risk cycle aging.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onExportCsv}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-shark-900 dark:hover:bg-shark-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-shark-600 transition-all active:scale-95 shadow-sm"
            title="Download CSV file for Excel"
          >
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV / Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-shark-300 hover:bg-slate-100 dark:hover:bg-shark-700/60 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-shark-600"
          >
            {isExpanded ? 'Hide Details ▲' : 'View Aging Cycles ▼'}
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="p-5 md:p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deployed */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-shark-900/70 border border-slate-100 dark:border-shark-700">
          <div className="text-[11px] font-bold text-slate-400 dark:text-shark-400 uppercase tracking-wider mb-1">
            Total Lent (Principal)
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalPrincipal)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-shark-500 mt-1">
            {loans.length} total loan records
          </div>
        </div>

        {/* Total Repaid / Cash Collected */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            Cash Collected
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalRepaid)}
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-500/80 mt-1">
            {recoveryRate}% total debt recovered
          </div>
        </div>

        {/* Outstanding Active Debt */}
        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
            Active Balance
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(totalRemainingActive)}
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-500/80 mt-1">
            Across {activeLoans.length} active borrowers
          </div>
        </div>

        {/* Accrued Interest */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-shark-900/70 border border-slate-100 dark:border-shark-700">
          <div className="text-[11px] font-bold text-slate-400 dark:text-shark-400 uppercase tracking-wider mb-1">
            Accrued Interest
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-money-600 dark:text-money-500">
            +{formatCurrency(totalAccruedInterest)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-shark-500 mt-1">
            Initial markup + compounding
          </div>
        </div>
      </div>

      {/* Expanded Risk & Aging Breakdown */}
      {isExpanded && (
        <div className="px-5 md:px-6 pb-6 pt-2 border-t border-slate-100 dark:border-shark-700/60 bg-slate-50/50 dark:bg-shark-900/30 animate-fadeIn">
          <h4 className="text-xs font-bold text-slate-500 dark:text-shark-400 uppercase tracking-wider mb-3">
            Active Loan Aging & Compounding Distribution
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Grace Period */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-shark-900 border border-slate-200 dark:border-shark-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Grace Period (0–30d)
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {gracePeriodCount} loans
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrency(gracePeriodValue)}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-shark-500 mt-0.5">
                Initial fixed fee period; not yet compounding.
              </p>
            </div>

            {/* Cycle 2 Compounding */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-shark-900 border border-slate-200 dark:border-shark-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Cycle 2 Compounding (31–60d)
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {compoundingCount} loans
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrency(compoundingValue)}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-shark-500 mt-0.5">
                First monthly compound interest applied.
              </p>
            </div>

            {/* Multi-Cycle Overdue */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-shark-900 border border-slate-200 dark:border-shark-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  High Risk (60+ days)
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {overdueCount} loans
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrency(overdueValue)}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-shark-500 mt-0.5">
                Multiple compounding cycles accumulated.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
