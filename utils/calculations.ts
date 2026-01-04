import { Loan, InterestType } from '../types';

export const calculateLoanDetails = (
  loan: Loan, 
  globalInitialRate: number, 
  globalMonthlyRate: number
) => {
  const start = new Date(loan.startDate);
  start.setHours(0, 0, 0, 0);
  
  const now = new Date();
  
  const diffInMs = now.getTime() - start.getTime();
  const daysElapsed = Math.max(0, diffInMs / (1000 * 60 * 60 * 24));
  
  // Determine rates to use (specific or global)
  const initialRate = loan.isFixedRate ? globalInitialRate : loan.initialInterestRate;
  const monthlyRate = loan.isFixedRate ? globalMonthlyRate : loan.interestRate;
  
  const principal = loan.principal;

  // Step 1: Calculate the "Base Debt" immediately upon taking the loan
  // "Automatically becomes 750 from the point they borrow" (if 500 principal + 50% initial)
  const initialInterestAmount = principal * (initialRate / 100);
  const baseDebt = principal + initialInterestAmount;

  let totalAmount = 0;
  const CYCLE_DAYS = 30;

  // Step 2: Determine compounding cycles
  // "Total owed remains the same until 30 days pass. That's when it starts compounding."
  const cycles = Math.floor(daysElapsed / CYCLE_DAYS);

  if (cycles <= 0) {
    // First 30 days (Day 0 to Day 29)
    totalAmount = baseDebt;
  } else {
    // After 30 days
    if (loan.interestType === InterestType.SIMPLE) {
      // Simple Interest on the Base Debt
      // Total = Base * (1 + (monthlyRate * cycles))
      totalAmount = baseDebt * (1 + ((monthlyRate / 100) * cycles));
    } else {
      // Compound Monthly on the Base Debt
      // Total = Base * (1 + monthlyRate)^cycles
      totalAmount = baseDebt * Math.pow(1 + (monthlyRate / 100), cycles);
    }
  }

  const interestAccrued = totalAmount - principal;

  return {
    totalAmount,
    interestAccrued,
    monthsElapsed: cycles,
    effectiveInitialRate: initialRate,
    effectiveMonthlyRate: monthlyRate
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