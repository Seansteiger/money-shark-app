import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    customerName: v.string(),
    principal: v.number(),
    initialInterestRate: v.number(),
    interestRate: v.number(),
    startDate: v.string(),
    interestType: v.union(v.literal("SIMPLE"), v.literal("COMPOUND")),
    isFixedRate: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const customerName = args.customerName.trim();
    
    // Find or create customer
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_userId_name", (q) => q.eq("userId", userId))
      .collect();
      
    let customer = customers.find(
      (c) => c.name.toLowerCase() === customerName.toLowerCase()
    );

    let customerId;
    if (!customer) {
      customerId = await ctx.db.insert("customers", {
        userId,
        name: customerName,
      });
      customer = {
        _id: customerId,
        userId,
        name: customerName,
        notes: "",
      } as any;
    } else {
      customerId = customer._id;
    }

    // Create loan
    const loanId = await ctx.db.insert("loans", {
      userId,
      customerId,
      principal: args.principal,
      initialInterestRate: args.initialInterestRate,
      interestRate: args.interestRate,
      startDate: args.startDate,
      interestType: args.interestType,
      isFixedRate: args.isFixedRate,
      status: "ACTIVE",
      notes: args.notes || "",
    });

    return {
      customer: {
        id: customer!._id,
        name: customer!.name,
        notes: customer!.notes || "",
      },
      loan: {
        id: loanId,
        customerId,
        principal: args.principal,
        initialInterestRate: args.initialInterestRate,
        interestRate: args.interestRate,
        startDate: args.startDate,
        interestType: args.interestType,
        isFixedRate: args.isFixedRate,
        status: "ACTIVE" as const,
        notes: args.notes || "",
      },
    };
  },
});

export const deleteLoan = mutation({
  args: {
    id: v.id("loans"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const loan = await ctx.db.get(args.id);
    if (!loan || loan.userId !== userId) {
      throw new Error("Loan not found");
    }

    await ctx.db.delete(args.id);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("loans"),
    status: v.union(v.literal("ACTIVE"), v.literal("PAID"), v.literal("DEFAULTED")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const loan = await ctx.db.get(args.id);
    if (!loan || loan.userId !== userId) {
      throw new Error("Loan not found");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
    });

    return args.status;
  },
});
