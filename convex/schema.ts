import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  settings: defineTable({
    userId: v.id("users"),
    globalInitialInterestRate: v.number(),
    globalInterestRate: v.number(),
    globalCompoundMonthly: v.boolean(),
    isBiometricLockEnabled: v.optional(v.boolean()),
    showHints: v.optional(v.boolean()),
  }).index("by_userId", ["userId"]),

  customers: defineTable({
    userId: v.id("users"),
    name: v.string(),
    avatar: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  }).index("by_userId_name", ["userId", "name"]),

  loans: defineTable({
    userId: v.id("users"),
    customerId: v.id("customers"),
    principal: v.number(),
    initialInterestRate: v.number(),
    interestRate: v.number(),
    startDate: v.string(), // ISO Date YYYY-MM-DD
    interestType: v.union(v.literal("SIMPLE"), v.literal("COMPOUND")),
    isFixedRate: v.boolean(),
    status: v.union(v.literal("ACTIVE"), v.literal("PAID"), v.literal("DEFAULTED")),
    notes: v.optional(v.string()),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  repayments: defineTable({
    userId: v.id("users"),
    loanId: v.id("loans"),
    customerId: v.id("customers"),
    amount: v.number(),
    paymentDate: v.string(), // ISO Date YYYY-MM-DD
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_loanId", ["loanId"]),

  passkeys: defineTable({
    userId: v.id("users"),
    credentialId: v.string(),
    deviceName: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]).index("by_credentialId", ["credentialId"]),
});
