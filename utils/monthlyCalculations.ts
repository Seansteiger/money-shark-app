import { Loan, Customer, Repayment, Expense, MonthSummary, MonthlyRecordItem } from '../types';

export const EXPENSE_CATEGORIES = [
  { id: 'TRANSPORT', label: 'Fuel & Transport', icon: '🚗', color: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-500/10 border-amber-500/30' },
  { id: 'AIRTIME', label: 'Airtime & Data', icon: '📱', color: 'text-sky-600 dark:text-sky-400', badgeBg: 'bg-sky-500/10 border-sky-500/30' },
  { id: 'ADMIN', label: 'Admin & Stationery', icon: '📋', color: 'text-purple-600 dark:text-purple-400', badgeBg: 'bg-purple-500/10 border-purple-500/30' },
  { id: 'BANK_FEES', label: 'Bank Fees & Charges', icon: '🏦', color: 'text-rose-600 dark:text-rose-400', badgeBg: 'bg-rose-500/10 border-rose-500/30' },
  { id: 'LEGAL', label: 'Legal & Recovery', icon: '⚖️', color: 'text-indigo-600 dark:text-indigo-400', badgeBg: 'bg-indigo-500/10 border-indigo-500/30' },
  { id: 'MARKETING', label: 'Marketing & Ads', icon: '📣', color: 'text-emerald-600 dark:text-emerald-400', badgeBg: 'bg-emerald-500/10 border-emerald-500/30' },
  { id: 'OTHER', label: 'General & Misc', icon: '🏷️', color: 'text-slate-600 dark:text-slate-400', badgeBg: 'bg-slate-500/10 border-slate-500/30' },
] as const;

export function getCategoryMeta(category: string) {
  const match = EXPENSE_CATEGORIES.find((c) => c.id === category);
  return (
    match || {
      id: category,
      label: category,
      icon: '🏷️',
      color: 'text-slate-600 dark:text-slate-400',
      badgeBg: 'bg-slate-500/10 border-slate-500/30',
    }
  );
}

export function getMonthKey(dateStr: string): string {
  if (!dateStr) return '';
  // Handles ISO date strings like "2026-10-01" or full ISO timestamps
  return dateStr.slice(0, 7);
}

export function getMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey.length < 7) return 'Unknown Month';
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  const date = new Date(year, monthIdx, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function calculateMonthlySummaries(
  loans: Loan[],
  repayments: Repayment[],
  expenses: Expense[] = [],
  customers: Customer[] = []
): MonthSummary[] {
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  // Collect all unique month keys
  const monthKeysSet = new Set<string>();
  const currentKey = getCurrentMonthKey();
  monthKeysSet.add(currentKey);

  loans.forEach((l) => {
    if (l.startDate) monthKeysSet.add(getMonthKey(l.startDate));
  });
  repayments.forEach((r) => {
    if (r.paymentDate) monthKeysSet.add(getMonthKey(r.paymentDate));
  });
  expenses.forEach((e) => {
    if (e.date) monthKeysSet.add(getMonthKey(e.date));
  });

  // Convert to array and sort descending (latest month first)
  const sortedMonthKeys = Array.from(monthKeysSet)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  return sortedMonthKeys.map((mKey) => {
    const [yearStr, monthStr] = mKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const monthLabel = getMonthLabel(mKey);

    // 1. Loans in this month (Capital Outflow / Expenditure)
    const monthLoans = loans.filter((l) => getMonthKey(l.startDate) === mKey);
    let loanCapitalOutflow = 0;
    const loanRecords: MonthlyRecordItem[] = monthLoans.map((l) => {
      loanCapitalOutflow += l.principal;
      const cust = customerMap.get(l.customerId);
      return {
        id: `loan_${l.id}`,
        type: 'LOAN',
        date: l.startDate,
        amount: l.principal,
        flow: 'OUTFLOW',
        title: cust?.name || 'Unknown Borrower',
        subtitle: `Issued Loan (Principal)`,
        statusBadge: l.status === 'PAID' ? 'Fully Repaid' : 'Active Loan',
        statusBadgeColor:
          l.status === 'PAID'
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        loanId: l.id,
        customerId: l.customerId,
        notes: l.notes,
      };
    });

    // 2. Repayments in this month (Cash Inflow)
    const monthRepayments = repayments.filter((r) => getMonthKey(r.paymentDate) === mKey);
    let cashCollected = 0;
    const repaymentRecords: MonthlyRecordItem[] = monthRepayments.map((r) => {
      cashCollected += r.amount;
      const cust = customerMap.get(r.customerId);
      return {
        id: `repay_${r.id}`,
        type: 'REPAYMENT',
        date: r.paymentDate,
        amount: r.amount,
        flow: 'INFLOW',
        title: cust?.name || 'Borrower',
        subtitle: r.paymentMethod ? `Repayment via ${r.paymentMethod}` : 'Loan Installment Repaid',
        statusBadge: 'Received',
        statusBadgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        loanId: r.loanId,
        customerId: r.customerId,
        notes: r.notes,
      };
    });

    // 3. Operational Expenses in this month (Expenditure)
    const monthExpenses = expenses.filter((e) => getMonthKey(e.date) === mKey);
    let operatingExpenses = 0;
    const expenseRecords: MonthlyRecordItem[] = monthExpenses.map((e) => {
      operatingExpenses += e.amount;
      const meta = getCategoryMeta(e.category);
      return {
        id: `exp_${e.id}`,
        type: 'EXPENSE',
        date: e.date,
        amount: e.amount,
        flow: 'OUTFLOW',
        title: meta.label,
        subtitle: e.notes || 'Operating Expense',
        category: e.category,
        statusBadge: `${meta.icon} ${meta.label}`,
        statusBadgeColor: `${meta.badgeBg} ${meta.color}`,
        notes: e.notes,
      };
    });

    // Combine all records for the month and sort chronologically descending (newest date first)
    const allRecords: MonthlyRecordItem[] = [
      ...loanRecords,
      ...repaymentRecords,
      ...expenseRecords,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalExpenditure = loanCapitalOutflow + operatingExpenses;
    const netCashFlow = cashCollected - totalExpenditure;

    return {
      monthKey: mKey,
      monthLabel,
      year,
      monthIndex,
      loanCapitalOutflow,
      operatingExpenses,
      totalExpenditure,
      cashCollected,
      netCashFlow,
      loansCount: monthLoans.length,
      repaymentsCount: monthRepayments.length,
      expensesCount: monthExpenses.length,
      records: allRecords,
    };
  });
}
