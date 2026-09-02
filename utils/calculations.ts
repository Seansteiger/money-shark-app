import { Loan, InterestType, Repayment } from '../types';

export interface LoanCalculations {
  totalAmount: number; // Gross amount owed (principal + initial markup + compound interest)
  interestAccrued: number; // Total interest accumulated
  monthsElapsed: number; // Compounded cycles completed
  effectiveInitialRate: number;
  effectiveMonthlyRate: number;
  // Repayments breakdown
  totalRepaid: number;
  remainingBalance: number;
  repaymentProgress: number; // 0 to 100%
  repaymentCount: number;
  isFullyPaid: boolean;
  // 30-Day Cycle Countdown & Urgency
  daysElapsed: number;
  daysInCurrentCycle: number;
  daysUntilNextCycle: number;
  nextCompoundDate: string; // ISO date or formatted
  riskCategory: 'GRACE_PERIOD' | 'COMPOUNDING_1' | 'OVERDUE_HIGH_RISK';
}

export const calculateLoanDetails = (
  loan: Loan, 
  globalInitialRate: number, 
  globalMonthlyRate: number,
  allRepayments: Repayment[] = []
): LoanCalculations => {
  const start = new Date(loan.startDate);
  start.setHours(0, 0, 0, 0);
  
  const now = new Date();
  
  const diffInMs = now.getTime() - start.getTime();
  const daysElapsed = Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));
  
  // Determine rates to use (specific or global)
  const initialRate = loan.isFixedRate ? globalInitialRate : loan.initialInterestRate;
  const monthlyRate = loan.isFixedRate ? globalMonthlyRate : loan.interestRate;
  
  const principal = loan.principal;

  // Step 1: Calculate the "Base Debt" immediately upon taking the loan
  const initialInterestAmount = principal * (initialRate / 100);
  const baseDebt = principal + initialInterestAmount;

  const CYCLE_DAYS = 30;
  const cycles = Math.floor(daysElapsed / CYCLE_DAYS);
  const daysInCurrentCycle = daysElapsed % CYCLE_DAYS;
  const daysUntilNextCycle = CYCLE_DAYS - daysInCurrentCycle;

  // Next compound date
  const nextCompoundTimestamp = start.getTime() + ((cycles + 1) * CYCLE_DAYS * 24 * 60 * 60 * 1000);
  const nextCompoundDate = new Date(nextCompoundTimestamp).toISOString().split('T')[0];

  let totalAmount = 0;

  // Step 2: Determine compounding cycles
  if (cycles <= 0) {
    totalAmount = baseDebt;
  } else {
    if (loan.interestType === InterestType.SIMPLE) {
      totalAmount = baseDebt * (1 + ((monthlyRate / 100) * cycles));
    } else {
      totalAmount = baseDebt * Math.pow(1 + (monthlyRate / 100), cycles);
    }
  }

  const interestAccrued = Math.max(0, totalAmount - principal);

  // Filter repayments for this specific loan
  const loanRepayments = allRepayments.filter(r => r.loanId === loan.id);
  const totalRepaid = loanRepayments.reduce((sum, r) => sum + r.amount, 0);
  const remainingBalance = Math.max(0, Math.round((totalAmount - totalRepaid) * 100) / 100);
  const isFullyPaid = remainingBalance <= 0.01 && (totalRepaid > 0 || loan.status === 'PAID');
  const repaymentProgress = totalAmount > 0 
    ? Math.min(100, Math.max(0, Math.round((totalRepaid / totalAmount) * 100))) 
    : 0;

  let riskCategory: 'GRACE_PERIOD' | 'COMPOUNDING_1' | 'OVERDUE_HIGH_RISK' = 'GRACE_PERIOD';
  if (cycles === 1) {
    riskCategory = 'COMPOUNDING_1';
  } else if (cycles >= 2) {
    riskCategory = 'OVERDUE_HIGH_RISK';
  }

  return {
    totalAmount,
    interestAccrued,
    monthsElapsed: cycles,
    effectiveInitialRate: initialRate,
    effectiveMonthlyRate: monthlyRate,
    totalRepaid,
    remainingBalance,
    repaymentProgress,
    repaymentCount: loanRepayments.length,
    isFullyPaid,
    daysElapsed,
    daysInCurrentCycle,
    daysUntilNextCycle,
    nextCompoundDate,
    riskCategory,
  };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};