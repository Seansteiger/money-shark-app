import { api } from '../convex/_generated/api';
import { convex } from './convexClient';
import { AppSettings, Customer, Loan, Repayment } from '../types';

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

export const recordPayment = async (payload: {
  loanId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
}) => {
  return (await convex.mutation(api.repayments.recordPayment, {
    loanId: payload.loanId as any,
    amount: payload.amount,
    paymentDate: payload.paymentDate,
    paymentMethod: payload.paymentMethod,
    notes: payload.notes,
  })) as Repayment & { isFullyPaid: boolean; totalRepaid: number; grossDebt: number };
};

export const deletePayment = async (id: string) => {
  return convex.mutation(api.repayments.deletePayment, { id: id as any });
};

export const listLoanPayments = async (loanId: string) => {
  return convex.query(api.repayments.listByLoan, { loanId: loanId as any });
};

export const listTrash = async () => {
  return convex.query(api.trash.listTrash);
};

export const restoreLoan = async (id: string) => {
  return convex.mutation(api.trash.restoreLoan, { id: id as any });
};

export const restoreCustomer = async (id: string) => {
  return convex.mutation(api.trash.restoreCustomer, { id: id as any });
};

export const restoreAllTrash = async () => {
  return convex.mutation(api.trash.restoreAll);
};

export const permanentlyDeleteLoan = async (id: string) => {
  return convex.mutation(api.trash.permanentlyDeleteLoan, { id: id as any });
};

export const permanentlyDeleteCustomer = async (id: string) => {
  return convex.mutation(api.trash.permanentlyDeleteCustomer, { id: id as any });
};

export const emptyTrash = async () => {
  return convex.mutation(api.trash.emptyTrash);
};

export const resetAllData = async () => {
  return convex.mutation(api.reset.resetData);
};

export const seedDemoData = async () => {
  return convex.mutation(api.seed.seedDemoData);
};
