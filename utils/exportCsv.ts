import { Loan, Customer, Repayment, AppSettings } from '../types';
import { calculateLoanDetails } from './calculations';

export function exportPortfolioToCsv(
  loans: Loan[],
  customers: Customer[],
  repayments: Repayment[],
  settings: AppSettings
) {
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const headers = [
    'Borrower Name',
    'Phone',
    'Address',
    'Loan ID',
    'Start Date',
    'Principal (ZAR)',
    'Initial Markup (%)',
    'Monthly Compound (%)',
    'Accrued Interest (ZAR)',
    'Gross Debt (ZAR)',
    'Total Repaid (ZAR)',
    'Remaining Balance (ZAR)',
    'Status',
    'Compounding Cycle',
    'Days Until Next Compound',
    'Next Compound Date',
    'Notes',
  ];

  const escapeCsv = (str: string | number | undefined | null) => {
    if (str === undefined || str === null) return '""';
    const stringified = String(str).replace(/"/g, '""');
    return `"${stringified}"`;
  };

  const rows = loans.map((loan) => {
    const customer = customerMap.get(loan.customerId);
    const calc = calculateLoanDetails(
      loan,
      settings.globalInitialInterestRate,
      settings.globalInterestRate,
      repayments
    );

    const initialRate = loan.isFixedRate ? settings.globalInitialInterestRate : loan.initialInterestRate;
    const monthlyRate = loan.isFixedRate ? settings.globalInterestRate : loan.interestRate;

    return [
      escapeCsv(customer?.name || 'Unknown'),
      escapeCsv(customer?.phone || ''),
      escapeCsv(customer?.address || ''),
      escapeCsv(loan.id),
      escapeCsv(loan.startDate),
      escapeCsv(loan.principal.toFixed(2)),
      escapeCsv(initialRate),
      escapeCsv(monthlyRate),
      escapeCsv(calc.interestAccrued.toFixed(2)),
      escapeCsv(calc.totalAmount.toFixed(2)),
      escapeCsv(calc.totalRepaid.toFixed(2)),
      escapeCsv(calc.remainingBalance.toFixed(2)),
      escapeCsv(loan.status),
      escapeCsv(`Cycle ${calc.monthsElapsed}`),
      escapeCsv(calc.daysUntilNextCycle),
      escapeCsv(calc.nextCompoundDate),
      escapeCsv(loan.notes || ''),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `MoneyShark_Portfolio_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportMonthlyRecordsToCsv(monthSummary: {
  monthLabel: string;
  monthKey: string;
  totalExpenditure: number;
  loanCapitalOutflow: number;
  operatingExpenses: number;
  cashCollected: number;
  netCashFlow: number;
  records: Array<{
    date: string;
    type: string;
    flow: string;
    title: string;
    subtitle: string;
    amount: number;
    notes?: string;
  }>;
}) {
  const escapeCsv = (str: string | number | undefined | null) => {
    if (str === undefined || str === null) return '""';
    const stringified = String(str).replace(/"/g, '""');
    return `"${stringified}"`;
  };

  const summaryHeader = [
    `"Money-Shark Monthly Financial Report - ${monthSummary.monthLabel}"`,
  ];
  const summaryRows = [
    `"Total Expenditure (ZAR)",${escapeCsv(monthSummary.totalExpenditure.toFixed(2))}`,
    `"Capital Lent Out (Principal ZAR)",${escapeCsv(monthSummary.loanCapitalOutflow.toFixed(2))}`,
    `"Operating Expenses (ZAR)",${escapeCsv(monthSummary.operatingExpenses.toFixed(2))}`,
    `"Cash Collected (Repayments ZAR)",${escapeCsv(monthSummary.cashCollected.toFixed(2))}`,
    `"Net Cash Flow (ZAR)",${escapeCsv(monthSummary.netCashFlow.toFixed(2))}`,
    '""', // Blank line
  ];

  const headers = [
    'Date',
    'Record Type',
    'Flow',
    'Client / Expense Category',
    'Description',
    'Amount (ZAR)',
    'Notes',
  ];

  const recordRows = monthSummary.records.map((r) =>
    [
      escapeCsv(r.date),
      escapeCsv(r.type),
      escapeCsv(r.flow),
      escapeCsv(r.title),
      escapeCsv(r.subtitle),
      escapeCsv(r.amount.toFixed(2)),
      escapeCsv(r.notes || ''),
    ].join(',')
  );

  const csvContent =
    '\uFEFF' +
    [
      ...summaryHeader,
      ...summaryRows,
      headers.join(','),
      ...recordRows,
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `MoneyShark_Monthly_${monthSummary.monthKey}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
