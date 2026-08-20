import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@moneyshark.com';
  
  // Clean up existing demo data if any, to allow clean re-runs
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('Demo user already exists. Re-seeding...');
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await bcrypt.hash('DemoPassword123!', 12);

  const demoUser = await prisma.user.create({
    data: {
      email,
      name: 'Demo Shark',
      passwordHash,
      settings: {
        create: {
          globalInitialInterestRate: 50,
          globalInterestRate: 30,
          globalCompoundMonthly: true,
        },
      },
    },
  });

  console.log(`Demo user created: ${demoUser.email}`);

  // Create demo customers
  const customer1 = await prisma.customer.create({
    data: {
      userId: demoUser.id,
      name: 'Tony Spilotro',
      notes: 'Loves high-stakes games.',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      userId: demoUser.id,
      name: 'Lefty Rosenthal',
      notes: 'Run-of-the-mill client.',
    },
  });

  console.log('Demo customers created.');

  // Create demo loans
  // Loan 1: Started 45 days ago (should have accrued interest)
  const date45DaysAgo = new Date();
  date45DaysAgo.setDate(date45DaysAgo.getDate() - 45);

  const loan1 = await prisma.loan.create({
    data: {
      userId: demoUser.id,
      customerId: customer1.id,
      principal: 1000,
      initialInterestRate: 50,
      interestRate: 30,
      startDate: date45DaysAgo,
      interestType: 'COMPOUND',
      isFixedRate: true,
      status: 'ACTIVE',
      notes: 'Initial high risk loan.',
    },
  });

  // Loan 2: Started 15 days ago (only initial interest accrued so far, no compounding cycles)
  const date15DaysAgo = new Date();
  date15DaysAgo.setDate(date15DaysAgo.getDate() - 15);

  const loan2 = await prisma.loan.create({
    data: {
      userId: demoUser.id,
      customerId: customer2.id,
      principal: 5000,
      initialInterestRate: 40,
      interestRate: 20,
      startDate: date15DaysAgo,
      interestType: 'SIMPLE',
      isFixedRate: false, // Custom rates
      status: 'ACTIVE',
      notes: 'Short term loan.',
    },
  });

  console.log('Demo loans created successfully.');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
