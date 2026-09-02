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
  isBiometricLockEnabled?: boolean;
  showHints?: boolean;
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