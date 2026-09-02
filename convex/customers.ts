import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const customers = await ctx.db
      .query("customers")
      .withIndex("by_userId_name", (q) => q.eq("userId", userId))
      .collect();

    const activeCustomers = customers.filter((c) => !c.isDeleted);

    return activeCustomers.map((c) => ({
      id: c._id,
      name: c.name,
      avatar: c.avatar || "",
      address: c.address || "",
      phone: c.phone || "",
      notes: c.notes || "",
    }));
  },
});

export const saveCustomer = mutation({
  args: {
    id: v.optional(v.id("customers")),
    name: v.string(),
    address: v.optional(v.string()),
    avatar: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Customer name is required");
    }

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing || existing.userId !== userId) {
        throw new Error("Customer not found");
      }

      await ctx.db.patch(args.id, {
        name: trimmedName,
        address: args.address !== undefined ? args.address.trim() : existing.address,
        avatar: args.avatar !== undefined ? args.avatar : existing.avatar,
        phone: args.phone !== undefined ? args.phone.trim() : existing.phone,
        notes: args.notes !== undefined ? args.notes : existing.notes,
      });

      return {
        id: args.id,
        name: trimmedName,
        address: args.address !== undefined ? args.address.trim() : (existing.address || ""),
        avatar: args.avatar !== undefined ? args.avatar : (existing.avatar || ""),
        phone: args.phone !== undefined ? args.phone.trim() : (existing.phone || ""),
        notes: args.notes !== undefined ? args.notes : (existing.notes || ""),
      };
    } else {
      // Check if customer name already exists
      const existingCustomers = await ctx.db
        .query("customers")
        .withIndex("by_userId_name", (q) => q.eq("userId", userId))
        .collect();

      const duplicate = existingCustomers.find(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (duplicate) {
        // Update existing customer info
        await ctx.db.patch(duplicate._id, {
          address: args.address !== undefined && args.address.trim() ? args.address.trim() : duplicate.address,
          avatar: args.avatar !== undefined && args.avatar ? args.avatar : duplicate.avatar,
          phone: args.phone !== undefined && args.phone.trim() ? args.phone.trim() : duplicate.phone,
          notes: args.notes !== undefined ? args.notes : duplicate.notes,
        });

        return {
          id: duplicate._id,
          name: duplicate.name,
          address: args.address !== undefined && args.address.trim() ? args.address.trim() : (duplicate.address || ""),
          avatar: args.avatar !== undefined && args.avatar ? args.avatar : (duplicate.avatar || ""),
          phone: args.phone !== undefined && args.phone.trim() ? args.phone.trim() : (duplicate.phone || ""),
          notes: args.notes !== undefined ? args.notes : (duplicate.notes || ""),
        };
      }

      const newId = await ctx.db.insert("customers", {
        userId,
        name: trimmedName,
        address: args.address ? args.address.trim() : "",
        avatar: args.avatar || "",
        phone: args.phone ? args.phone.trim() : "",
        notes: args.notes || "",
      });

      return {
        id: newId,
        name: trimmedName,
        address: args.address ? args.address.trim() : "",
        avatar: args.avatar || "",
        phone: args.phone ? args.phone.trim() : "",
        notes: args.notes || "",
      };
    }
  },
});

export const updateAvatar = mutation({
  args: {
    id: v.id("customers"),
    avatar: v.string(), // Base64 data URL
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

    await ctx.db.patch(args.id, {
      avatar: args.avatar,
    });

    return { success: true };
  },
});

export const deleteCustomer = mutation({
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

    const now = Date.now();

    // 30-Day Soft Delete for all associated loans
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("customerId"), args.id))
      .collect();

    for (const loan of loans) {
      await ctx.db.patch(loan._id, {
        isDeleted: true,
        deletedAt: now,
      });
    }

    // 30-Day Soft Delete for customer
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: now,
    });

    return { success: true };
  },
});
