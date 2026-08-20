import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const save = mutation({
  args: {
    globalInitialInterestRate: v.number(),
    globalInterestRate: v.number(),
    globalCompoundMonthly: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    const data = {
      userId,
      globalInitialInterestRate: args.globalInitialInterestRate,
      globalInterestRate: args.globalInterestRate,
      globalCompoundMonthly: args.globalCompoundMonthly,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("settings", data);
    }

    return {
      globalInitialInterestRate: args.globalInitialInterestRate,
      globalInterestRate: args.globalInterestRate,
      globalCompoundMonthly: args.globalCompoundMonthly,
    };
  },
});
