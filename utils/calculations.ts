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
  // 30-Day Cycle Countdown, Grace Period & Urgency
  daysElapsed: number;
  daysInCurrentCycle: number;
  daysUntilNextCycle: number; // Days until next compound interest addition
  nextCompoundDate: string; // Date when interest will compound (end of grace period)
  cycleDueDate: string; // Base 30-day cycle due date
  daysUntilCycleDue: number; // Days remaining to base 30-day mark (can be negative if in grace)
  gracePeriodDays: number; // Default: 7
  isInGracePeriod: boolean; // True if within the 7-day grace period
  graceDaysRemaining: number; // Days left in grace window before interest compounds
  graceDeadlineDate: string; // ISO date when grace period expires
  riskCategory: 'GRACE_PERIOD' | 'COMPOUNDING_1' | 'OVERDUE_HIGH_RISK';
  // Half-Payment & Installment tracking
  baseHalfAmount: number; // 50% of original gross debt
  remainingHalfAmount: number; // 50% of current remaining balance
  isHalfPaid: boolean; // True if at least 48% of loan has been settled but not 100%
}

export const calculateLoanDetails = (
  loan: Loan, 
  globalInitialRate: number, 
  globalMonthlyRate: number,
  allRepayments: Repayment[] = [],
  gracePeriodDays: number = 7
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
  const GRACE_DAYS = Math.max(0, gracePeriodDays ?? 7);

  // Compounding cycles determination:
  // Each cycle compounds only when daysElapsed strictly exceeds (cycleNumber * 30 + GRACE_DAYS).
  // E.g. with 7 days grace:
  // Cycle 1 interest only applies after day 37 (days 31-37 are in Grace Period with 0 interest added).
  // Cycle 2 interest only applies after day 67 (days 61-67 in Grace Period), etc.
  let cycles = 0;
  while (daysElapsed > (cycles + 1) * CYCLE_DAYS + GRACE_DAYS) {
    cycles++;
  }

  // Active cycle thresholds
  const currentCycleBaseDays = (cycles + 1) * CYCLE_DAYS;
  const currentCycleGraceThreshold = currentCycleBaseDays + GRACE_DAYS;

  // In Grace Period: daysElapsed > 30*k AND daysElapsed <= 30*k + 7
  const isInGracePeriod = daysElapsed > currentCycleBaseDays && daysElapsed <= currentCycleGraceThreshold;
  const graceDaysRemaining = isInGracePeriod ? Math.max(0, currentCycleGraceThreshold - daysElapsed) : 0;

  // Cycle due date (the 30-day target)
  const cycleDueTimestamp = start.getTime() + (currentCycleBaseDays * 24 * 60 * 60 * 1000);
  const cycleDueDate = new Date(cycleDueTimestamp).toISOString().split('T')[0];
  const daysUntilCycleDue = Math.ceil((cycleDueTimestamp - now.getTime()) / (1000 * 60 * 60 * 24));

  // Next compound date (after grace period ends)
  const nextCompoundTimestamp = start.getTime() + (currentCycleGraceThreshold * 24 * 60 * 60 * 1000);
  const nextCompoundDate = new Date(nextCompoundTimestamp).toISOString().split('T')[0];
  const graceDeadlineDate = nextCompoundDate;
  const daysUntilNextCycle = Math.max(0, Math.ceil((nextCompoundTimestamp - now.getTime()) / (1000 * 60 * 60 * 24)));

  const daysInCurrentCycle = daysElapsed % CYCLE_DAYS;

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

  // Filter repayments for this specific loan (deduplicating any duplicate settlement records)
  const loanRepayments = allRepayments.filter(r => r.loanId === loan.id);
  const uniqueRepayments = loanRepayments.filter((r, idx, arr) => {
    if (r.notes && (r.notes.includes("Paid in Full") || r.notes.includes("Full settlement"))) {
      return arr.findIndex(x => x.amount === r.amount && x.paymentDate === r.paymentDate) === idx;
    }
    return true;
  });

  const loggedTotalRepaid = uniqueRepayments.reduce((sum, r) => sum + r.amount, 0);

  // If a loan is marked PAID:
  // - Total repaid should equal the full gross debt (strictly capped to never exceed gross debt)
  // - If no manual repayments are logged, totalRepaid defaults to totalAmount
  // - Remaining balance is strictly 0
  const isPaid = loan.status === 'PAID';
  const cappedRepaid = Math.min(loggedTotalRepaid, totalAmount);
  const totalRepaid = isPaid && loggedTotalRepaid === 0 ? totalAmount : cappedRepaid;
  const remainingBalance = isPaid ? 0 : Math.max(0, Math.round((totalAmount - totalRepaid) * 100) / 100);
  const isFullyPaid = isPaid || remainingBalance <= 0.01;
  const repaymentProgress = isPaid 
    ? 100 
    : (totalAmount > 0 ? Math.min(100, Math.max(0, Math.round((totalRepaid / totalAmount) * 100))) : 0);
  const repaymentCount = isPaid && uniqueRepayments.length === 0 ? 1 : uniqueRepayments.length;

  let riskCategory: 'GRACE_PERIOD' | 'COMPOUNDING_1' | 'OVERDUE_HIGH_RISK' = 'GRACE_PERIOD';
  if (cycles === 1) {
    riskCategory = 'COMPOUNDING_1';
  } else if (cycles >= 2) {
    riskCategory = 'OVERDUE_HIGH_RISK';
  }

  // Half payment calculations
  const baseHalfAmount = Math.round((baseDebt / 2) * 100) / 100;
  const remainingHalfAmount = Math.round((remainingBalance / 2) * 100) / 100;
  const isHalfPaid = !isFullyPaid && totalRepaid >= (baseHalfAmount - 0.05);

  return {
    totalAmount,
    interestAccrued,
    monthsElapsed: cycles,
    effectiveInitialRate: initialRate,
    effectiveMonthlyRate: monthlyRate,
    totalRepaid,
    remainingBalance,
    repaymentProgress,
    repaymentCount,
    isFullyPaid,
    daysElapsed,
    daysInCurrentCycle,
    daysUntilNextCycle,
    nextCompoundDate,
    cycleDueDate,
    daysUntilCycleDue,
    gracePeriodDays: GRACE_DAYS,
    isInGracePeriod,
    graceDaysRemaining,
    graceDeadlineDate,
    riskCategory,
    baseHalfAmount,
    remainingHalfAmount,
    isHalfPaid,
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