import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const save = mutation({
  args: {
    globalInitialInterestRate: v.number(),
    globalInterestRate: v.number(),
    globalCompoundMonthly: v.boolean(),
    isBiometricLockEnabled: v.optional(v.boolean()),
    showHints: v.optional(v.boolean()),
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

    const data: any = {
      userId,
      globalInitialInterestRate: args.globalInitialInterestRate,
      globalInterestRate: args.globalInterestRate,
      globalCompoundMonthly: args.globalCompoundMonthly,
    };

    if (args.isBiometricLockEnabled !== undefined) {
      data.isBiometricLockEnabled = args.isBiometricLockEnabled;
    }

    if (args.showHints !== undefined) {
      data.showHints = args.showHints;
    }

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("settings", data);
    }

    return {
      globalInitialInterestRate: args.globalInitialInterestRate,
      globalInterestRate: args.globalInterestRate,
      globalCompoundMonthly: args.globalCompoundMonthly,
      isBiometricLockEnabled: args.isBiometricLockEnabled ?? existing?.isBiometricLockEnabled ?? false,
      showHints: args.showHints ?? existing?.showHints ?? true,
    };
  },
});
