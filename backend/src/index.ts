import app from './app.js';
import { config } from './config/index.js';
import { CareScheduler } from './services/scheduler/care-scheduler.js';
import { AccountSyncService } from './services/meta-api/account-sync.service.js';
import { PasswordUtil } from './utils/password.js';
import prisma from './db.js';

const PORT = config.port;

async function bootstrap() {
  try {
    // 1. Ensure a default admin user exists
    let adminUser = await prisma.user.findFirst();
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: config.defaultUserEmail,
          name: 'Auto Ads Admin',
          role: 'ADMIN',
          passwordHash: PasswordUtil.hashPassword('admin123'),
        },
      });
      console.log(`[Bootstrap] Created default admin user: ${adminUser.email} (Password: admin123)`);
    } else if (!adminUser.passwordHash) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { passwordHash: PasswordUtil.hashPassword('admin123') },
      });
      console.log(`[Bootstrap] Updated admin password: admin123`);
    }

    // 2. Ensure initial Emergency Stop setting exists & periodic report is off by default
    await prisma.systemSetting.upsert({
      where: { key: 'EMERGENCY_STOP' },
      update: {},
      create: {
        key: 'EMERGENCY_STOP',
        value: 'false',
        description: 'Global Emergency Stop Kill Switch',
      },
    });

    // Disable 5-minute periodic spam report by default (only notify on auto-pause & manual pause)
    await prisma.systemSetting.upsert({
      where: { key: 'TELEGRAM_PERIODIC_ENABLED' },
      update: { value: 'false' },
      create: {
        key: 'TELEGRAM_PERIODIC_ENABLED',
        value: 'false',
        description: 'Periodic report disabled by default to avoid spam',
      },
    });


    // 3. Clean up any leftover mock accounts from previous demo runs
    try {
      await prisma.adAccount.deleteMany({
        where: {
          OR: [
            { isMock: true },
            { facebookAdAccountId: { contains: 'mock' } },
            { name: { contains: '[MOCK]' } },
          ],
        },
      });
      await prisma.connectedAccount.deleteMany({
        where: {
          OR: [
            { isMock: true },
            { accountName: { contains: 'Demo' } },
            { accountName: { contains: '[MOCK]' } },
          ],
        },
      });
      console.log('[Bootstrap] Cleaned up demo mock data. Pure live mode ready.');
    } catch (cleanErr: any) {
      console.warn('[Bootstrap] Clean mock skipped:', cleanErr.message);
    }


    // 4. Start the background scheduler
    CareScheduler.start();

    // 5. Start HTTP server
    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`🚀 Auto Ads Care Backend is running on port ${PORT}`);
      console.log(`📡 Healthcheck: http://localhost:${PORT}/health`);
      console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🛡️  Emergency Stop: ${config.emergencyStop ? 'ENABLED' : 'DISABLED'}`);
      console.log(`=================================================`);
    });
  } catch (err: any) {
    console.error('[Bootstrap Error] Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
