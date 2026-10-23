import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/db.js';
import { ActionExecutor } from '../src/services/rule-engine/action-executor.js';
import { AccountSyncService } from '../src/services/meta-api/account-sync.service.js';

describe('ActionExecutor Safety Tests', () => {
  let mockAccountId: string;
  let ruleId: string;

  beforeAll(async () => {
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'test@autoadscare.io', name: 'Test User' },
      });
    }

    mockAccountId = await AccountSyncService.seedMockAccountIfNeeded(user.id);
    const rule = await prisma.careRule.findFirst({ where: { adAccountId: mockAccountId } });
    ruleId = rule!.id;
  });

  afterAll(async () => {
    // Reset Emergency stop setting
    await prisma.systemSetting.upsert({
      where: { key: 'EMERGENCY_STOP' },
      update: { value: 'false' },
      create: { key: 'EMERGENCY_STOP', value: 'false' },
    });
  });

  it('Dry Run mode never calls live API and returns actionTaken: DRY_RUN', async () => {
    const result = await ActionExecutor.executePause({
      ruleId,
      adAccountId: mockAccountId,
      entityType: 'ADSET',
      entityId: 'mock_adset_001',
      entityName: 'Test AdSet Dry Run',
      isDryRun: true,
      reason: 'Testing Dry Run safety guarantee',
    });

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('DRY_RUN');
    expect(result.message).toContain('Chế độ thử nghiệm Dry Run');
  });

  it('Emergency Stop aborts all actions immediately with BLOCKED_BY_SAFETY', async () => {
    // Turn ON emergency stop
    await prisma.systemSetting.upsert({
      where: { key: 'EMERGENCY_STOP' },
      update: { value: 'true' },
      create: { key: 'EMERGENCY_STOP', value: 'true' },
    });

    const result = await ActionExecutor.executePause({
      ruleId,
      adAccountId: mockAccountId,
      entityType: 'ADSET',
      entityId: 'mock_adset_001',
      entityName: 'Test Emergency Stop',
      isDryRun: false,
      reason: 'Should be blocked',
    });

    expect(result.success).toBe(false);
    expect(result.actionTaken).toBe('BLOCKED_BY_SAFETY');
    expect(result.message).toContain('Emergency Stop');

    // Turn OFF emergency stop
    await prisma.systemSetting.update({
      where: { key: 'EMERGENCY_STOP' },
      data: { value: 'false' },
    });
  });
});
