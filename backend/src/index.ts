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

    // 2. Ensure initial Emergency Stop setting exists
    await prisma.systemSetting.upsert({
      where: { key: 'EMERGENCY_STOP' },
      update: {},
      create: {
        key: 'EMERGENCY_STOP',
        value: 'false',
        description: 'Global Emergency Stop Kill Switch',
      },
    });

    // 3. Seed mock account if no accounts exist and mock fallback is enabled
    if (config.enableMockFallback) {
      const existingAccount = await prisma.adAccount.findFirst();
      if (!existingAccount) {
        console.log('[Bootstrap] No accounts found. Initializing Realistic Mock Mode with Demo Campaigns...');
        await AccountSyncService.seedMockAccountIfNeeded(adminUser.id);
        console.log('[Bootstrap] Mock Mode initialized successfully.');
      }
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
