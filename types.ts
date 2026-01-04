export interface Customer {
  id: string;
  name: string;
  notes?: string;
}

export enum InterestType {
  SIMPLE = 'SIMPLE',
  COMPOUND = 'COMPOUND',
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