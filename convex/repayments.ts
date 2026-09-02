import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to compute total gross debt for a loan
function computeGrossDebt(
  principal: number,
  initialRate: number,
  monthlyRate: number,
  interestType: string,
  startDateStr: string
): number {
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  const diffInMs = now.getTime() - start.getTime();
  const daysElapsed = Math.max(0, diffInMs / (1000 * 60 * 60 * 24));
  
  const initialInterestAmount = principal * (initialRate / 100);
  const baseDebt = principal + initialInterestAmount;
  const cycles = Math.floor(daysElapsed / 30);

  if (cycles <= 0) {
    return baseDebt;
  }
  if (interestType === "SIMPLE") {
    return baseDebt * (1 + (monthlyRate / 100) * cycles);
  }
  return baseDebt * Math.pow(1 + monthlyRate / 100, cycles);
}

export const recordPayment = mutation({
  args: {
    loanId: v.id("loans"),
    amount: v.number(),
    paymentDate: v.string(),
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }

    const loan = await ctx.db.get(args.loanId);
    if (!loan || loan.userId !== userId) {
      throw new Error("Loan not found");
    }

    // Insert repayment record
    const repaymentId = await ctx.db.insert("repayments", {
      userId,
      loanId: args.loanId,
      customerId: loan.customerId,
      amount: args.amount,
      paymentDate: args.paymentDate || new Date().toISOString().split("T")[0],
      paymentMethod: args.paymentMethod || undefined,
      notes: args.notes || "",
    });

    // Fetch all active repayments for this loan to verify remaining balance
    const repayments = await ctx.db
      .query("repayments")
      .withIndex("by_loanId", (q) => q.eq("loanId", args.loanId))
      .collect();

    const totalRepaid = repayments
      .filter((r) => !r.isDeleted)
      .reduce((sum, r) => sum + r.amount, 0);

    // Fetch settings for global rates fallback
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    const effectiveInitialRate = loan.isFixedRate && settings
      ? settings.globalInitialInterestRate
      : loan.initialInterestRate;

    const effectiveMonthlyRate = loan.isFixedRate && settings
      ? settings.globalInterestRate
      : loan.interestRate;

    const grossDebt = computeGrossDebt(
      loan.principal,
      effectiveInitialRate,
      effectiveMonthlyRate,
      loan.interestType,
      loan.startDate
    );

    // If fully paid, update status to PAID automatically
    if (totalRepaid >= grossDebt && loan.status === "ACTIVE") {
      await ctx.db.patch(args.loanId, { status: "PAID" });
    }

    return {
      id: repaymentId,
      loanId: args.loanId,
      customerId: loan.customerId,
      amount: args.amount,
      paymentDate: args.paymentDate,
      paymentMethod: args.paymentMethod,
      notes: args.notes || "",
      totalRepaid,
      grossDebt,
      isFullyPaid: totalRepaid >= grossDebt,
    };
  },
});

export const deletePayment = mutation({
  args: {
    id: v.id("repayments"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const repayment = await ctx.db.get(args.id);
    if (!repayment || repayment.userId !== userId) {
      throw new Error("Repayment not found");
    }

    // Soft delete repayment
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    // Check remaining balance on the loan
    const loan = await ctx.db.get(repayment.loanId);
    if (loan && loan.status === "PAID") {
      const remainingPayments = await ctx.db
        .query("repayments")
        .withIndex("by_loanId", (q) => q.eq("loanId", repayment.loanId))
        .collect();

      const totalRepaid = remainingPayments
        .filter((r) => !r.isDeleted && r._id !== args.id)
        .reduce((sum, r) => sum + r.amount, 0);

      const settings = await ctx.db
        .query("settings")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();

      const effectiveInitialRate = loan.isFixedRate && settings
        ? settings.globalInitialInterestRate
        : loan.initialInterestRate;

      const effectiveMonthlyRate = loan.isFixedRate && settings
        ? settings.globalInterestRate
        : loan.interestRate;

      const grossDebt = computeGrossDebt(
        loan.principal,
        effectiveInitialRate,
        effectiveMonthlyRate,
        loan.interestType,
        loan.startDate
      );

      // If debt is no longer fully cleared, revert to ACTIVE
      if (totalRepaid < grossDebt) {
        await ctx.db.patch(repayment.loanId, { status: "ACTIVE" });
      }
    }

    return { success: true };
  },
});

export const listByLoan = query({
  args: {
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const payments = await ctx.db
      .query("repayments")
      .withIndex("by_loanId", (q) => q.eq("loanId", args.loanId))
      .collect();

    return payments
      .filter((p) => !p.isDeleted && p.userId === userId)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .map((p) => ({
        id: p._id,
        loanId: p.loanId,
        customerId: p.customerId,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        notes: p.notes || "",
        createdAt: p._creationTime,
      }));
  },
});
