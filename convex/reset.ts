import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_SETTINGS = {
  globalInitialInterestRate: 50,
  globalInterestRate: 30,
  globalCompoundMonthly: true,
};

export const resetData = mutation({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Delete all loans for this user
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const loan of loans) {
      await ctx.db.delete(loan._id);
    }

    // Delete all customers for this user
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_userId_name", (q) => q.eq("userId", userId))
      .collect();
    for (const customer of customers) {
      await ctx.db.delete(customer._id);
    }

    // Reset settings
    const existingSettings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, DEFAULT_SETTINGS);
    } else {
      await ctx.db.insert("settings", {
        userId,
        ...DEFAULT_SETTINGS,
      });
    }
  },
});

