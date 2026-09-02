import { api } from '../convex/_generated/api';
import { convex } from './convexClient';
import { AppSettings, Customer, Loan } from '../types';

export const getBootstrap = async () => {
  return convex.query(api.bootstrap.get);
};

export const saveSettings = async (settings: AppSettings) => {
  return (await convex.mutation(api.settings.save, { ...settings })) as AppSettings;
};

export const createLoan = async (payload: {
  customerName: string;
  customerAddress?: string;
  customerAvatar?: string;
  customerPhone?: string;
  principal: number;
  initialInterestRate: number;
  interestRate: number;
  startDate: string;
  interestType: Loan['interestType'];
  isFixedRate: boolean;
  notes: string;
}) => {
  return (await convex.mutation(api.loans.create, payload)) as { customer: Customer; loan: Loan };
};

export const saveCustomer = async (payload: {
  id?: string;
  name: string;
  address?: string;
  avatar?: string;
  phone?: string;
  notes?: string;
}) => {
  return (await convex.mutation(api.customers.saveCustomer, payload as any)) as Customer;
};

export const deleteCustomer = async (id: string) => {
  return convex.mutation(api.customers.deleteCustomer, { id: id as any });
};

export const deleteLoan = async (id: string) => {
  return convex.mutation(api.loans.deleteLoan, { id: id as any });
};

export const updateLoanStatus = async (id: string, status: Loan['status']) => {
  return convex.mutation(api.loans.updateStatus, { id: id as any, status });
};

export const resetAllData = async () => {
  return convex.mutation(api.reset.resetData);
};

export const seedDemoData = async () => {
  return convex.mutation(api.seed.seedDemoData);
};
