import React, { useState, useMemo } from 'react';
import { Loan, Customer, Repayment, Expense, MonthSummary, MonthlyRecordItem } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';
import {
  calculateMonthlySummaries,
  getCurrentMonthKey,
  getMonthLabel,
  getCategoryMeta,
  EXPENSE_CATEGORIES,
} from '../utils/monthlyCalculations';
import { exportMonthlyRecordsToCsv } from '../utils/exportCsv';

interface MonthlyExpenditureViewProps {
  loans: Loan[];
  customers: Customer[];
  repayments: Repayment[];
  expenses: Expense[];
  onOpenNewLoan: () => void;
  onOpenExpenseModal: (defaultDate?: string) => void;
  onDeleteExpense: (expenseId: string) => Promise<void>;
  onViewLoanDetails?: (loanId: string) => void;
}

export const MonthlyExpenditureView: React.FC<MonthlyExpenditureViewProps> = ({
  loans,
  customers,
  repayments,
  expenses,
  onOpenNewLoan,
  onOpenExpenseModal,
  onDeleteExpense,
  onViewLoanDetails,
}) => {
  // All monthly summaries computed from loans, repayments, and expenses
  const summaries = useMemo(
    () => calculateMonthlySummaries(loans, repayments, expenses, customers),
    [loans, repayments, expenses, customers]
  );

  const currentMonthKey = getCurrentMonthKey();
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    summaries[0]?.monthKey || currentMonthKey
  );
  const [filterTab, setFilterTab] = useState<'ALL' | 'EXPENDITURE' | 'COLLECTIONS' | 'EXPENSES'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Active month summary
  const activeMonth = useMemo(() => {
    return (
      summaries.find((s) => s.monthKey === selectedMonthKey) ||
      summaries[0] || {
        monthKey: currentMonthKey,
        monthLabel: getMonthLabel(currentMonthKey),
        year: parseInt(currentMonthKey.split('-')[0], 10),
        monthIndex: parseInt(currentMonthKey.split('-')[1], 10) - 1,
        loanCapitalOutflow: 0,
        operatingExpenses: 0,
        totalExpenditure: 0,
        cashCollected: 0,
        netCashFlow: 0,
        loansCount: 0,
        repaymentsCount: 0,
        expensesCount: 0,
        records: [],
      }
    );
  }, [summaries, selectedMonthKey, currentMonthKey]);

  // Navigate between months
  const activeMonthIndex = summaries.findIndex((s) => s.monthKey === selectedMonthKey);
  const hasNewer = activeMonthIndex > 0;
  const hasOlder = activeMonthIndex >= 0 && activeMonthIndex < summaries.length - 1;

  const handlePrevMonth = () => {
    if (hasOlder) {
      setSelectedMonthKey(summaries[activeMonthIndex + 1].monthKey);
    }
  };

  const handleNextMonth = () => {
    if (hasNewer) {
      setSelectedMonthKey(summaries[activeMonthIndex - 1].monthKey);
    }
  };

  // Filtered records for selected month
  const filteredRecords = useMemo(() => {
    let list = activeMonth.records;

    if (filterTab === 'EXPENDITURE') {
      list = list.filter((r) => r.flow === 'OUTFLOW');
    } else if (filterTab === 'COLLECTIONS') {
      list = list.filter((r) => r.flow === 'INFLOW');
    } else if (filterTab === 'EXPENSES') {
      list = list.filter((r) => r.type === 'EXPENSE');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.subtitle.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          r.amount.toString().includes(q)
      );
    }

    return list;
  }, [activeMonth.records, filterTab, searchTerm]);

  // 6-Month Comparison Data (latest 6 months in chronological order)
  const sixMonthTrend = useMemo(() => {
    const subset = summaries.slice(0, 6).reverse();
    const maxVal = Math.max(
      ...subset.map((s) => Math.max(s.totalExpenditure, s.cashCollected, 1))
    );
    return subset.map((s) => ({
      ...s,
      expPercent: Math.round((s.totalExpenditure / maxVal) * 100),
      colPercent: Math.round((s.cashCollected / maxVal) * 100),
    }));
  }, [summaries]);

  // Expense categories breakdown for active month
  const activeMonthCategoryBreakdown = useMemo(() => {
    const monthExpenses = expenses.filter((e) => e.date.startsWith(activeMonth.monthKey));
    const catMap = new Map<string, number>();
    monthExpenses.forEach((e) => {
      catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
    });
    return Array.from(catMap.entries()).map(([cat, total]) => ({
      ...getCategoryMeta(cat),
      amount: total,
    }));
  }, [expenses, activeMonth.monthKey]);

  const handleDeleteExpenseClick = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) {
      return;
    }
    try {
      setDeletingExpenseId(expenseId);
      await onDeleteExpense(expenseId);
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleExportThisMonth = () => {
    exportMonthlyRecordsToCsv(activeMonth);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Monthly Expenditure & Records
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {activeMonth.records.length} records
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-shark-400 mt-1">
            Overall records, capital outflow, and cash repayments grouped by month.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onOpenExpenseModal(activeMonth.monthKey + '-01')}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-900/20 cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <span>💸</span>
            <span>+ Log Expense</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewLoan}
            className="px-3.5 py-2 bg-money-600 hover:bg-money-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-money-900/20 cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>+ Issue Loan</span>
          </button>

          <button
            type="button"
            onClick={handleExportThisMonth}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-shark-800 dark:hover:bg-shark-700 text-slate-700 dark:text-shark-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-shark-700 cursor-pointer active:scale-95 flex items-center gap-1.5"
            title="Download this month's CSV report"
          >
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* Month Navigator Bar */}
      <div className="bg-white dark:bg-shark-800/90 rounded-2xl border border-slate-200 dark:border-shark-700 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!hasOlder}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-shark-700 transition-colors cursor-pointer"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Month Dropdown Selector */}
          <div className="flex items-center gap-2">
            <span className="text-base select-none">📅</span>
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="bg-slate-50 dark:bg-shark-900 text-slate-900 dark:text-white font-bold text-sm sm:text-base px-3 py-1.5 rounded-xl border border-slate-200 dark:border-shark-700 outline-none focus:border-money-500 cursor-pointer"
            >
              {summaries.map((s) => (
                <option key={s.monthKey} value={s.monthKey}>
                  {s.monthLabel} {s.monthKey === currentMonthKey ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={!hasNewer}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-shark-700 transition-colors cursor-pointer"
            title="Next Month"
            aria-label="Next Month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Quick Month Status Indicator */}
        <div className="flex items-center gap-2 text-xs">
          {activeMonth.netCashFlow >= 0 ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1.5">
              <span>●</span> Cash Surplus Month (+{formatCurrency(activeMonth.netCashFlow)})
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 flex items-center gap-1.5">
              <span>●</span> Capital Deployment Month ({formatCurrency(activeMonth.netCashFlow)})
            </span>
          )}
        </div>
      </div>

      {/* KPI Summary Cards for Selected Month */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Monthly Expenditure */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-shark-800 border border-rose-200/60 dark:border-rose-900/40 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total Expenditure</span>
            <span>💸</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {formatCurrency(activeMonth.totalExpenditure)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-shark-400 mt-1.5 flex flex-col gap-0.5">
            <span>Lent: {formatCurrency(activeMonth.loanCapitalOutflow)}</span>
            <span>Expenses: {formatCurrency(activeMonth.operatingExpenses)}</span>
          </div>
        </div>

        {/* 2. Total Cash Collected (Repayments) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-shark-800 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Cash Collected</span>
            <span>📥</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(activeMonth.cashCollected)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1.5">
            {activeMonth.repaymentsCount} repayment payment{activeMonth.repaymentsCount === 1 ? '' : 's'}
          </div>
        </div>

        {/* 3. Net Cash Flow */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-shark-800 border border-slate-200 dark:border-shark-700 shadow-sm relative overflow-hidden group">
          <div
            className={`absolute top-0 left-0 right-0 h-1 ${
              activeMonth.netCashFlow >= 0 ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          <div className="text-[11px] font-bold text-slate-400 dark:text-shark-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Net Cash Flow</span>
            <span>⚖️</span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold font-mono ${
              activeMonth.netCashFlow >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {activeMonth.netCashFlow >= 0 ? '+' : ''}
            {formatCurrency(activeMonth.netCashFlow)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-shark-400 mt-1.5">
            {activeMonth.netCashFlow >= 0
              ? 'Inflow exceeds expenditure'
              : 'Capital deployment / growth'}
          </div>
        </div>

        {/* 4. Month Activity Volume */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-shark-800 border border-slate-200 dark:border-shark-700 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-money-500 to-indigo-500" />
          <div className="text-[11px] font-bold text-slate-400 dark:text-shark-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Records Volume</span>
            <span>📑</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {activeMonth.records.length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-shark-400 mt-1.5">
            {activeMonth.loansCount} loans • {activeMonth.expensesCount} expenses
          </div>
        </div>
      </div>

      {/* 6-Month Visual Comparative Trend */}
      {sixMonthTrend.length > 1 && (
        <div className="bg-white dark:bg-shark-800 rounded-3xl border border-slate-200 dark:border-shark-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📊</span> 6-Month Expenditure vs Collections Trend
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-shark-400">
                Visual side-by-side comparison of Outflow (Expenditure) vs Inflow (Repayments).
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Expenditure
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Collections
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
            {sixMonthTrend.map((m) => {
              const isSelected = m.monthKey === selectedMonthKey;
              return (
                <button
                  key={m.monthKey}
                  type="button"
                  onClick={() => setSelectedMonthKey(m.monthKey)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-36 ${
                    isSelected
                      ? 'bg-slate-100/90 dark:bg-shark-750 border-money-500 ring-2 ring-money-500/30'
                      : 'bg-slate-50 dark:bg-shark-900/60 border-slate-200 dark:border-shark-700/60 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                    {m.monthLabel.split(' ')[0].slice(0, 3)} '{m.year.toString().slice(-2)}
                  </div>

                  {/* Dual Bar Display */}
                  <div className="flex items-end justify-center gap-2 h-16 my-1">
                    {/* Expenditure Bar */}
                    <div className="w-3 bg-slate-200 dark:bg-shark-700 rounded-t-sm h-full flex items-end overflow-hidden">
                      <div
                        className="w-full bg-rose-500 transition-all duration-300"
                        style={{ height: `${Math.max(6, m.expPercent)}%` }}
                        title={`Expenditure: ${formatCurrency(m.totalExpenditure)}`}
                      />
                    </div>
                    {/* Collections Bar */}
                    <div className="w-3 bg-slate-200 dark:bg-shark-700 rounded-t-sm h-full flex items-end overflow-hidden">
                      <div
                        className="w-full bg-emerald-500 transition-all duration-300"
                        style={{ height: `${Math.max(6, m.colPercent)}%` }}
                        title={`Collections: ${formatCurrency(m.cashCollected)}`}
                      />
                    </div>
                  </div>

                  <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-shark-400 text-center truncate">
                    {formatCurrency(m.cashCollected - m.totalExpenditure)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expense Categories Breakdown (if operational expenses exist) */}
      {activeMonthCategoryBreakdown.length > 0 && (
        <div className="bg-white dark:bg-shark-800 rounded-3xl border border-slate-200 dark:border-shark-700 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 dark:text-shark-400 uppercase tracking-wider">
              {activeMonth.monthLabel} Operating Expenses Breakdown
            </h3>
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
              Total: {formatCurrency(activeMonth.operatingExpenses)}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeMonthCategoryBreakdown.map((cat) => (
              <div
                key={cat.id}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${cat.badgeBg}`}
              >
                <span>{cat.icon}</span>
                <span className={cat.color}>{cat.label}:</span>
                <span className="font-mono font-bold">{formatCurrency(cat.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Records Section for Selected Month */}
      <div className="bg-white dark:bg-shark-800 rounded-3xl border border-slate-200 dark:border-shark-700 shadow-sm overflow-hidden">
        {/* Controls Bar: Filter Tabs & Search */}
        <div className="p-4 border-b border-slate-100 dark:border-shark-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-shark-900 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'ALL'
                  ? 'bg-white dark:bg-shark-750 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Records ({activeMonth.records.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('EXPENDITURE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'EXPENDITURE'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/20'
                  : 'text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Expenditures ({activeMonth.loansCount + activeMonth.expensesCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('COLLECTIONS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'COLLECTIONS'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20'
                  : 'text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Collections ({activeMonth.repaymentsCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('EXPENSES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'EXPENSES'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-900/20'
                  : 'text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Operating Costs ({activeMonth.expensesCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search records or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 bg-slate-50 dark:bg-shark-900 border border-slate-200 dark:border-shark-700 rounded-xl text-slate-900 dark:text-white text-xs outline-none focus:border-money-500 transition-colors"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              🔍
            </span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Records Feed */}
        {filteredRecords.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-shark-700/60">
            {filteredRecords.map((item) => {
              const isOutflow = item.flow === 'OUTFLOW';
              const isExpense = item.type === 'EXPENSE';
              const isLoan = item.type === 'LOAN';
              const isRepayment = item.type === 'REPAYMENT';

              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-slate-50/70 dark:hover:bg-shark-750/40 transition-colors flex items-center justify-between gap-3 group"
                >
                  {/* Left Icon & Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Flow Circle Icon */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-sm border ${
                        isOutflow
                          ? isExpense
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {isRepayment ? '📥' : isExpense ? '💸' : '🏷️'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </span>
                        {item.statusBadge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              item.statusBadgeColor ||
                              'bg-slate-100 dark:bg-shark-700 text-slate-600 dark:text-shark-300'
                            }`}
                          >
                            {item.statusBadge}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-shark-400 mt-0.5 flex-wrap">
                        <span>{formatDate(item.date)}</span>
                        <span>•</span>
                        <span className="truncate">{item.subtitle}</span>
                        {item.notes && (
                          <>
                            <span>•</span>
                            <span className="italic text-slate-400 dark:text-shark-500 truncate max-w-xs">
                              "{item.notes}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Amount & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-sm sm:text-base font-bold font-mono ${
                          isOutflow
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isOutflow ? '-' : '+'}
                        {formatCurrency(item.amount)}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-shark-500 uppercase tracking-wider">
                        {isOutflow ? 'Expenditure' : 'Inflow'}
                      </div>
                    </div>

                    {/* Expense Delete Button */}
                    {isExpense && (
                      <button
                        type="button"
                        onClick={() => handleDeleteExpenseClick(item.id.replace('exp_', ''))}
                        disabled={deletingExpenseId === item.id.replace('exp_', '')}
                        className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-shark-700 transition-colors cursor-pointer"
                        title="Delete this expense"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}

                    {/* Loan Details Link */}
                    {isLoan && item.loanId && onViewLoanDetails && (
                      <button
                        type="button"
                        onClick={() => onViewLoanDetails(item.loanId!)}
                        className="p-1.5 text-slate-400 hover:text-money-500 rounded-lg hover:bg-slate-100 dark:hover:bg-shark-700 transition-colors cursor-pointer"
                        title="View loan"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-shark-750 text-slate-400 flex items-center justify-center mx-auto text-xl">
              📂
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                No records found for {activeMonth.monthLabel}
              </p>
              <p className="text-xs text-slate-500 dark:text-shark-400 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? 'No records match your search filter.'
                  : 'No loans, repayments, or expenses have been recorded for this month yet.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenExpenseModal(activeMonth.monthKey + '-01')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                + Log Expense
              </button>
              <button
                type="button"
                onClick={onOpenNewLoan}
                className="px-3.5 py-1.5 bg-money-600 hover:bg-money-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                + Issue Loan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
