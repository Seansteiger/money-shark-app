import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log("Seeding data for user:", userId);

    // Clean up existing settings, loans, and customers for this user
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const s of settings) {
      await ctx.db.delete(s._id);
    }

    const loans = await ctx.db
      .query("loans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const l of loans) {
      await ctx.db.delete(l._id);
    }

    const customers = await ctx.db
      .query("customers")
      .withIndex("by_userId_name", (q) => q.eq("userId", userId))
      .collect();
    for (const c of customers) {
      await ctx.db.delete(c._id);
    }

    // Create settings
    await ctx.db.insert("settings", {
      userId,
      globalInitialInterestRate: 50,
      globalInterestRate: 30,
      globalCompoundMonthly: true,
    });

    // Create customers
    const customerId1 = await ctx.db.insert("customers", {
      userId,
      name: "Tony Spilotro",
      notes: "Loves high-stakes games.",
    });

    const customerId2 = await ctx.db.insert("customers", {
      userId,
      name: "Lefty Rosenthal",
      notes: "Run-of-the-mill client.",
    });

    // Create loans
    const date45DaysAgo = new Date();
    date45DaysAgo.setDate(date45DaysAgo.getDate() - 45);

    await ctx.db.insert("loans", {
      userId,
      customerId: customerId1,
      principal: 1000,
      initialInterestRate: 50,
      interestRate: 30,
      startDate: date45DaysAgo.toISOString().split('T')[0],
      interestType: "COMPOUND",
      isFixedRate: true,
      status: "ACTIVE",
      notes: "Initial high risk loan.",
    });

    const date15DaysAgo = new Date();
    date15DaysAgo.setDate(date15DaysAgo.getDate() - 15);

    await ctx.db.insert("loans", {
      userId,
      customerId: customerId2,
      principal: 5000,
      initialInterestRate: 40,
      interestRate: 20,
      startDate: date15DaysAgo.toISOString().split('T')[0],
      interestType: "SIMPLE",
      isFixedRate: false,
      status: "ACTIVE",
      notes: "Short term loan.",
    });

    console.log("Demo account successfully seeded in Convex!");
    return "Seeding completed successfully!";
  },
});
