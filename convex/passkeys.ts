import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const passkeys = await ctx.db
      .query("passkeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return passkeys.map((p) => ({
      id: p._id,
      credentialId: p.credentialId,
      deviceName: p.deviceName,
      createdAt: p.createdAt,
    }));
  },
});

export const savePasskey = mutation({
  args: {
    credentialId: v.string(),
    deviceName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Check if credential already exists
    const existing = await ctx.db
      .query("passkeys")
      .withIndex("by_credentialId", (q) => q.eq("credentialId", args.credentialId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const id = await ctx.db.insert("passkeys", {
      userId,
      credentialId: args.credentialId,
      deviceName: args.deviceName,
      createdAt: Date.now(),
    });

    // Also ensure biometric lock setting is enabled
    const settingsDoc = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (settingsDoc) {
      await ctx.db.patch(settingsDoc._id, { isBiometricLockEnabled: true });
    }

    return id;
  },
});

export const removePasskey = mutation({
  args: {
    id: v.id("passkeys"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const passkey = await ctx.db.get(args.id);
    if (!passkey || passkey.userId !== userId) {
      throw new Error("Passkey not found or unauthorized");
    }

    await ctx.db.delete(args.id);

    // If no more passkeys exist, optionally update settings
    const remaining = await ctx.db
      .query("passkeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (remaining.length === 0) {
      const settingsDoc = await ctx.db
        .query("settings")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();

      if (settingsDoc) {
        await ctx.db.patch(settingsDoc._id, { isBiometricLockEnabled: false });
      }
    }

    return { success: true };
  },
});
