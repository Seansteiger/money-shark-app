import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_SETTINGS = {
  globalInitialInterestRate: 50,
  globalInterestRate: 30,
  globalCompoundMonthly: true,
  isBiometricLockEnabled: false,
  showHints: true,
};

export const get = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const settingsDoc = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    const customersDocs = await ctx.db
      .query("customers")
      .withIndex("by_userId_name", (q) => q.eq("userId", userId))
      .collect();

    const loansDocs = await ctx.db
      .query("loans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const repaymentsDocs = await ctx.db
      .query("repayments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Filter out soft-deleted records (30-day recovery vault items)
    const activeCustomers = customersDocs.filter((c) => !c.isDeleted);
    const activeLoans = loansDocs.filter((l) => !l.isDeleted);
    const activeRepayments = repaymentsDocs.filter((r) => !r.isDeleted);

    // Sort loans by creation time descending
    const sortedLoans = [...activeLoans].sort((a, b) => b._creationTime - a._creationTime);
    // Sort customers by creation time descending
    const sortedCustomers = [...activeCustomers].sort((a, b) => b._creationTime - a._creationTime);
    // Sort repayments by payment date descending
    const sortedRepayments = [...activeRepayments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    return {
      settings: settingsDoc
        ? {
            globalInitialInterestRate: settingsDoc.globalInitialInterestRate,
            globalInterestRate: settingsDoc.globalInterestRate,
            globalCompoundMonthly: settingsDoc.globalCompoundMonthly,
            isBiometricLockEnabled: settingsDoc.isBiometricLockEnabled ?? false,
            showHints: settingsDoc.showHints ?? true,
          }
        : DEFAULT_SETTINGS,
      customers: sortedCustomers.map((c) => ({
        id: c._id,
        name: c.name,
        avatar: c.avatar || "",
        address: c.address || "",
        phone: c.phone || "",
        notes: c.notes || "",
      })),
      loans: sortedLoans.map((l) => ({
        id: l._id,
        customerId: l.customerId,
        principal: l.principal,
        initialInterestRate: l.initialInterestRate,
        interestRate: l.interestRate,
        startDate: l.startDate,
        interestType: l.interestType,
        isFixedRate: l.isFixedRate,
        status: l.status,
        notes: l.notes || "",
      })),
      repayments: sortedRepayments.map((r) => ({
        id: r._id,
        loanId: r.loanId,
        customerId: r.customerId,
        amount: r.amount,
        paymentDate: r.paymentDate,
        paymentMethod: r.paymentMethod,
        notes: r.notes || "",
        createdAt: r._creationTime,
      })),
    };
  },
});
