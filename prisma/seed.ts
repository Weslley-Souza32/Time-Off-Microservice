import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.hcmMockBalance.upsert({
    where: {
      employeeId_locationId: {
        employeeId: 'emp_001',
        locationId: 'loc_ny',
      },
    },
    update: {
      balanceUnits: 1000,
    },
    create: {
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      balanceUnits: 1000,
    },
  });

  await prisma.hcmMockBalance.upsert({
    where: {
      employeeId_locationId: {
        employeeId: 'emp_002',
        locationId: 'loc_sp',
      },
    },
    update: {
      balanceUnits: 500,
    },
    create: {
      employeeId: 'emp_002',
      locationId: 'loc_sp',
      balanceUnits: 500,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
