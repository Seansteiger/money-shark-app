import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    customerName: v.string(),
    customerAddress: v.optional(v.string()),
    customerAvatar: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
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
        address: args.customerAddress ? args.customerAddress.trim() : "",
        avatar: args.customerAvatar || "",
        phone: args.customerPhone ? args.customerPhone.trim() : "",
        notes: "",
      });
      customer = {
        _id: customerId,
        userId,
        name: customerName,
        address: args.customerAddress ? args.customerAddress.trim() : "",
        avatar: args.customerAvatar || "",
        phone: args.customerPhone ? args.customerPhone.trim() : "",
        notes: "",
      } as any;
    } else {
      customerId = customer._id;
      // If customer was found but we now have address or avatar, update it
      const updates: any = {};
      if (args.customerAddress && (!customer.address || customer.address === "")) {
        updates.address = args.customerAddress.trim();
        customer.address = args.customerAddress.trim();
      }
      if (args.customerAvatar && (!customer.avatar || customer.avatar === "")) {
        updates.avatar = args.customerAvatar;
        customer.avatar = args.customerAvatar;
      }
      if (args.customerPhone && (!customer.phone || customer.phone === "")) {
        updates.phone = args.customerPhone.trim();
        customer.phone = args.customerPhone.trim();
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(customerId, updates);
      }
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
        address: customer!.address || "",
        avatar: customer!.avatar || "",
        phone: customer!.phone || "",
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

    // 30-Day Cloud Recovery Soft Delete
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });
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
