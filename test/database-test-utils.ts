import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../src/database/prisma.service';

export async function applyInitialSchema(prisma: PrismaService) {
  const migrationPath = join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260428005000_init',
    'migration.sql',
  );
  const sql = await readFile(migrationPath, 'utf8');
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

export async function resetDatabase(prisma: PrismaService) {
  await prisma.hcmMockUsage.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.balance.deleteMany();
  await prisma.hcmMockBalance.deleteMany();
}
