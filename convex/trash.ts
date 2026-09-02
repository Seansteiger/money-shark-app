import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const listTrash = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { loans: [], customers: [], totalCount: 0 };
    }

    const now = Date.now();

    // Fetch deleted loans
    const allLoans = await ctx.db
      .query("loans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const deletedLoans = allLoans.filter((l) => l.isDeleted === true);

    // Fetch deleted customers
    const allCustomers = await ctx.db
      .query("customers")
      .withIndex("by_userId_name", (q) => q.eq("userId", userId))
      .collect();

    const deletedCustomers = allCustomers.filter((c) => c.isDeleted === true);

    // Map customer names for loans
    const customerMap = new Map(allCustomers.map((c) => [c._id.toString(), c.name]));

    const mappedLoans = deletedLoans.map((l) => {
      const deletedAt = l.deletedAt || now;
      const elapsedMs = now - deletedAt;
      const daysRemaining = Math.max(0, 30 - Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));

      return {
        id: l._id,
        type: "LOAN" as const,
        customerName: customerMap.get(l.customerId.toString()) || "Unknown Borrower",
        principal: l.principal,
        startDate: l.startDate,
        status: l.status,
        deletedAt,
        daysRemaining,
        isExpired: elapsedMs > THIRTY_DAYS_MS,
      };
    });

    const mappedCustomers = deletedCustomers.map((c) => {
      const deletedAt = c.deletedAt || now;
      const elapsedMs = now - deletedAt;
      const daysRemaining = Math.max(0, 30 - Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));

      return {
        id: c._id,
        type: "CUSTOMER" as const,
        name: c.name,
        address: c.address || "",
        avatar: c.avatar || "",
        phone: c.phone || "",
        deletedAt,
        daysRemaining,
        isExpired: elapsedMs > THIRTY_DAYS_MS,
      };
    });

    return {
      loans: mappedLoans,
      customers: mappedCustomers,
      totalCount: mappedLoans.length + mappedCustomers.length,
    };
  },
});

export const restoreLoan = mutation({
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
      throw new Error("Loan record not found");
    }

    // Ensure associated customer is also restored if soft-deleted
    const customer = await ctx.db.get(loan.customerId);
    if (customer && customer.isDeleted) {
      await ctx.db.patch(customer._id, {
        isDeleted: false,
        deletedAt: undefined,
      });
    }

    await ctx.db.patch(args.id, {
      isDeleted: false,
      deletedAt: undefined,
    });

    return { success: true };
  },
});

export const restoreCustomer = mutation({
  args: {
    id: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const customer = await ctx.db.get(args.id);
    if (!customer || customer.userId !== userId) {
      throw new Error("Customer record not found");
    }

    // Restore customer
    await ctx.db.patch(args.id, {
      isDeleted: false,
      deletedAt: undefined,
    });

    // Also restore customer's associated loans
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("customerId"), args.id))
      .collect();

    for (const loan of loans) {
      if (loan.isDeleted) {
        await ctx.db.patch(loan._id, {
          isDeleted: false,
          deletedAt: undefined,
        });
      }
    }

    return { success: true };
  },
});

export const restoreAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const customers = await ctx.db
      .query("customers")
      .withIndex("by_userId_name", (q) => q.eq("userId", userId))
      .collect();

    for (const c of customers) {
      if (c.isDeleted) {
        await ctx.db.patch(c._id, {
          isDeleted: false,
          deletedAt: undefined,
        });
      }
    }

    const loans = await ctx.db
      .query("loans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const l of loans) {
      if (l.isDeleted) {
        await ctx.db.patch(l._id, {
          isDeleted: false,
          deletedAt: undefined,
        });
      }
    }

    return { success: true };
  },
});

export const permanentlyDeleteLoan = mutation({
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
    return { success: true };
  },
});

export const permanentlyDeleteCustomer = mutation({
  args: {
    id: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const customer = await ctx.db.get(args.id);
    if (!customer || customer.userId !== userId) {
      throw new Error("Customer not found");
    }

    const loans = await ctx.db
      .query("loans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("customerId"), args.id))
      .collect();

    for (const l of loans) {
      await ctx.db.delete(l._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const emptyTrash = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const loans = await ctx.db
      .query("loans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const l of loans) {
      if (l.isDeleted) {
        await ctx.db.delete(l._id);
      }
    }

    const customers = await ctx.db
      .query("customers")
      .withIndex("by_userId_name", (q) => q.eq("userId", userId))
      .collect();

    for (const c of customers) {
      if (c.isDeleted) {
        await ctx.db.delete(c._id);
      }
    }

    return { success: true };
  },
});
