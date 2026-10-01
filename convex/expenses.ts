import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createExpense = mutation({
  args: {
    amount: v.number(),
    category: v.string(),
    date: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    if (args.amount <= 0) {
      throw new Error("Expense amount must be greater than zero");
    }

    const expenseId = await ctx.db.insert("expenses", {
      userId,
      amount: args.amount,
      category: args.category,
      date: args.date,
      notes: args.notes,
      isDeleted: false,
    });

    const doc = await ctx.db.get(expenseId);
    return {
      id: expenseId,
      amount: doc!.amount,
      category: doc!.category,
      date: doc!.date,
      notes: doc!.notes || "",
      createdAt: doc!._creationTime,
    };
  },
});

export const deleteExpense = mutation({
  args: {
    id: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const expense = await ctx.db.get(args.id);
    if (!expense || expense.userId !== userId) {
      throw new Error("Expense not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return { success: true };
  },
});

export const listExpenses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const docs = await ctx.db
      .query("expenses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return docs
      .filter((e) => !e.isDeleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((e) => ({
        id: e._id,
        amount: e.amount,
        category: e.category,
        date: e.date,
        notes: e.notes || "",
        createdAt: e._creationTime,
      }));
  },
});
