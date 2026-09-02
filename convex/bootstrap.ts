import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_SETTINGS = {
  globalInitialInterestRate: 50,
  globalInterestRate: 30,
  globalCompoundMonthly: true,
  isBiometricLockEnabled: false,
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

    // Sort loans by creation time descending
    const sortedLoans = [...loansDocs].sort((a, b) => b._creationTime - a._creationTime);
    // Sort customers by creation time descending
    const sortedCustomers = [...customersDocs].sort((a, b) => b._creationTime - a._creationTime);

    return {
      settings: settingsDoc
        ? {
            globalInitialInterestRate: settingsDoc.globalInitialInterestRate,
            globalInterestRate: settingsDoc.globalInterestRate,
            globalCompoundMonthly: settingsDoc.globalCompoundMonthly,
            isBiometricLockEnabled: settingsDoc.isBiometricLockEnabled ?? false,
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
    };
  },
});
