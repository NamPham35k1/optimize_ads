import prisma from './db.js';
import { AccountSyncService } from './services/meta-api/account-sync.service.js';
import { config } from './config/index.js';

async function main() {
  console.log('[Seed] Seeding database...');

  let adminUser = await prisma.user.findFirst();
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: config.defaultUserEmail,
        name: 'Auto Ads Admin',
        role: 'ADMIN',
      },
    });
  }

  const accountId = await AccountSyncService.seedMockAccountIfNeeded(adminUser.id);
  console.log(`[Seed] Seeded mock account ID: ${accountId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
