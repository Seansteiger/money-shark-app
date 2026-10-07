export interface Customer {
  id: string;
  name: string;
  avatar?: string;
  address?: string;
  phone?: string;
  notes?: string;
}

export enum InterestType {
  SIMPLE = 'SIMPLE',
  COMPOUND = 'COMPOUND',
}

export interface Repayment {
  id: string;
  loanId: string;
  customerId: string;
  amount: number;
  paymentDate: string; // ISO date YYYY-MM-DD
  paymentMethod?: string;
  notes?: string;
  createdAt?: number;
}

export interface Loan {
  id: string;
  customerId: string;
  principal: number;
  initialInterestRate: number; // The immediate markup percentage (e.g. 50%)
  interestRate: number; // Monthly compounding rate in percentage
  startDate: string; // ISO Date string
  interestType: InterestType;
  isFixedRate: boolean; // If true, uses global settings for both rates
  status: 'ACTIVE' | 'PAID' | 'DEFAULTED';
  notes?: string;
}

export interface AppSettings {
  globalInitialInterestRate: number;
  globalInterestRate: number;
  globalCompoundMonthly: boolean;
  gracePeriodDays?: number; // Grace period buffer in days (default: 7 days)
  isBiometricLockEnabled?: boolean;
  showHints?: boolean;
  autoRemoveInactiveClients?: boolean;
  loanSortBy?: 'BALANCE_DESC' | 'DUE_SOONEST' | 'NEWEST' | 'NAME' | string;
  clientSortBy?: 'NAME_ASC' | 'NAME_DESC' | 'ACTIVE_FIRST' | 'DEBT_DESC' | string;
}

export interface TrashLoan {
  id: string;
  type: 'LOAN';
  customerName: string;
  principal: number;
  startDate: string;
  status: 'ACTIVE' | 'PAID' | 'DEFAULTED';
  deletedAt: number;
  daysRemaining: number;
  isExpired: boolean;
}

export interface TrashCustomer {
  id: string;
  type: 'CUSTOMER';
  name: string;
  address?: string;
  avatar?: string;
  phone?: string;
  deletedAt: number;
  daysRemaining: number;
  isExpired: boolean;
}

export interface TrashData {
  loans: TrashLoan[];
  customers: TrashCustomer[];
  totalCount: number;
}

export interface UserPasskey {
  id: string;
  credentialId: string;
  deviceName: string;
  createdAt: number;
}

export interface ScannedData {
  customerName?: string;
  amount?: number;
  date?: string;
  rate?: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64
  isSystem?: boolean;
}

export type ExpenseCategory =
  | 'TRANSPORT'
  | 'AIRTIME'
  | 'ADMIN'
  | 'BANK_FEES'
  | 'LEGAL'
  | 'MARKETING'
  | 'OTHER';

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory | string;
  date: string; // ISO date YYYY-MM-DD
  notes?: string;
  createdAt?: number;
}

export interface MonthlyRecordItem {
  id: string;
  type: 'LOAN' | 'REPAYMENT' | 'EXPENSE';
  date: string; // YYYY-MM-DD
  amount: number;
  flow: 'OUTFLOW' | 'INFLOW';
  title: string;
  subtitle: string;
  category?: string;
  statusBadge?: string;
  statusBadgeColor?: string;
  loanId?: string;
  customerId?: string;
  notes?: string;
}

export interface MonthSummary {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "October 2026"
  year: number;
  monthIndex: number; // 0-11
  loanCapitalOutflow: number; // Principal lent out
  operatingExpenses: number; // Business expenses
  totalExpenditure: number; // loanCapitalOutflow + operatingExpenses
  cashCollected: number; // Repayments
  netCashFlow: number; // cashCollected - totalExpenditure
  loansCount: number;
  repaymentsCount: number;
  expensesCount: number;
  records: MonthlyRecordItem[];
}