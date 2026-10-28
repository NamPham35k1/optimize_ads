import prisma from '../../db.js';
import { MetaService } from '../meta-api/meta-service.js';
import { TelegramService } from '../telegram/telegram.service.js';
import { config } from '../../config/index.js';

export interface ActionPayload {
  ruleId: string;
  adAccountId: string;
  entityType: 'CAMPAIGN' | 'ADSET' | 'AD';
  entityId: string;
  entityName: string;
  isDryRun: boolean;
  reason: string;
}

export interface ActionResult {
  success: boolean;
  actionTaken: 'DRY_RUN' | 'PAUSED' | 'SKIPPED' | 'FAILED' | 'BLOCKED_BY_SAFETY';
  message: string;
  isVerified: boolean;
  actionId?: string;
  error?: string;
}

export class ActionExecutor {
  /**
   * Check if the global Emergency Stop is engaged.
   */
  public static async isEmergencyStopActive(): Promise<boolean> {
    if (config.emergencyStop) return true;
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'EMERGENCY_STOP' },
      });
      return setting?.value === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Execute an automated Pause action safely with Dry Run and verification.
   */
  public static async executePause(payload: ActionPayload): Promise<ActionResult> {
    const { ruleId, adAccountId, entityType, entityId, entityName, isDryRun, reason } = payload;

    // Safety 1: Check Global Emergency Stop
    const isEmergency = await this.isEmergencyStopActive();
    if (isEmergency) {
      console.warn(`[ActionExecutor] Emergency Stop is ACTIVE. Pausing aborted for ${entityType} ${entityId}`);
      await prisma.automationAction.create({
        data: {
          ruleId,
          adAccountId,
          entityType,
          entityId,
          entityName,
          actionType: 'PAUSE',
          status: 'BLOCKED_BY_SAFETY',
          errorMessage: 'Hành động bị chặn bởi công tắc dừng khẩn cấp (Emergency Stop)',
          isVerified: false,
        },
      });
      return {
        success: false,
        actionTaken: 'BLOCKED_BY_SAFETY',
        message: 'Hành động bị chặn bởi công tắc dừng khẩn cấp (Emergency Stop)',
        isVerified: false,
      };
    }

    // Safety 2: Dry Run Mode Check
    if (isDryRun) {
      console.log(`[ActionExecutor DRY RUN] Would pause ${entityType} ${entityName} (${entityId}): ${reason}`);
      const action = await prisma.automationAction.create({
        data: {
          ruleId,
          adAccountId,
          entityType,
          entityId,
          entityName,
          actionType: 'PAUSE',
          status: 'DRY_RUN',
          apiResponse: JSON.stringify({ dryRun: true, plannedReason: reason }),
          isVerified: true,
        },
      });

      // Record a notification for the Dry Run action
      await prisma.notification.create({
        data: {
          adAccountId,
          ruleId,
          title: `[Dry Run] Dự kiến tắt ${entityType}: ${entityName}`,
          message: `Quy tắc phát hiện vi phạm: ${reason}. Không thay đổi trạng thái thật vì đang chạy chế độ Dry Run.`,
          severity: 'INFO',
        },
      });

      // Send alert to Telegram (fire-and-forget)
      TelegramService.sendPauseAlert({
        entityType,
        entityName,
        entityId,
        reason,
        adAccountId,
        isDryRun: true,
      }).catch(() => {});

      return {
        success: true,
        actionTaken: 'DRY_RUN',
        message: `[Chế độ thử nghiệm Dry Run] Đã ghi nhận hành động dự kiến tắt ${entityName}. Không can thiệp API thật.`,
        isVerified: true,
        actionId: action.id,
      };
    }

    // Live Mode Execution: Safety 3 - Idempotency and Pre-action verification
    try {
      const { client, accessToken } = await MetaService.getClientForAccount(adAccountId);

      const level = entityType.toLowerCase() as 'campaign' | 'adset' | 'ad';
      const currentStatus = await client.getEntityStatus(entityId, level, accessToken);

      if (currentStatus.status === 'PAUSED' || currentStatus.effectiveStatus.includes('PAUSED')) {
        console.log(`[ActionExecutor] Entity ${entityId} is ALREADY paused. Skipping redundant API write.`);
        return {
          success: true,
          actionTaken: 'SKIPPED',
          message: `${entityName} hiện đã ở trạng thái PAUSED trên Meta. Bỏ qua để tránh gọi API trùng lặp.`,
          isVerified: true,
        };
      }

      // Safety 4: Perform Pause on Meta API
      const pauseRes = await client.pauseEntity(entityId, level, accessToken);

      if (!pauseRes.success) {
        throw new Error(`Xác minh sau khi gửi lệnh thất bại: Trạng thái trả về là ${pauseRes.effectiveStatus}`);
      }

      // Mark in DB Snapshot as paused by system to distinguish from user manual pause
      if (entityType === 'CAMPAIGN') {
        await prisma.campaignSnapshot.updateMany({
          where: { fbCampaignId: entityId },
          data: { status: 'PAUSED', isPausedBySystem: true },
        });
      } else if (entityType === 'ADSET') {
        await prisma.adSetSnapshot.updateMany({
          where: { fbAdSetId: entityId },
          data: { status: 'PAUSED', isPausedBySystem: true },
        });
      } else if (entityType === 'AD') {
        await prisma.adSnapshot.updateMany({
          where: { fbAdId: entityId },
          data: { status: 'PAUSED', isPausedBySystem: true },
        });
      }

      // Record successful live action
      const action = await prisma.automationAction.create({
        data: {
          ruleId,
          adAccountId,
          entityType,
          entityId,
          entityName,
          actionType: 'PAUSE',
          status: 'SUCCESS',
          preActionStatus: currentStatus.effectiveStatus,
          postActionStatus: pauseRes.effectiveStatus,
          apiResponse: JSON.stringify(pauseRes.apiResponse),
          isVerified: pauseRes.success,
        },
      });

      // Send critical notification
      await prisma.notification.create({
        data: {
          adAccountId,
          ruleId,
          title: `Đã tự động tạm dừng ${entityType}: ${entityName}`,
          message: `Hệ thống đã gửi lệnh tắt đối tượng và xác minh trạng thái thành công. Lý do: ${reason}`,
          severity: 'CRITICAL',
        },
      });

      // Send live alert to Telegram with quick buttons (fire-and-forget)
      TelegramService.sendPauseAlert({
        entityType,
        entityName,
        entityId,
        reason,
        adAccountId,
        isDryRun: false,
      }).catch(() => {});

      return {
        success: true,
        actionTaken: 'PAUSED',
        message: `Đã tạm dừng thành công ${entityName} trên Meta và xác minh trạng thái.`,
        isVerified: true,
        actionId: action.id,
      };
    } catch (err: any) {
      console.error(`[ActionExecutor Error] Failed to pause ${entityId}: ${err.message}`);

      await prisma.automationAction.create({
        data: {
          ruleId,
          adAccountId,
          entityType,
          entityId,
          entityName,
          actionType: 'PAUSE',
          status: 'FAILED',
          errorMessage: err.message,
          isVerified: false,
        },
      });

      await prisma.notification.create({
        data: {
          adAccountId,
          ruleId,
          title: `Lỗi khi tự động tắt ${entityType}: ${entityName}`,
          message: `Không thể thực hiện tắt đối tượng qua API Meta: ${err.message}`,
          severity: 'CRITICAL',
        },
      });

      return {
        success: false,
        actionTaken: 'FAILED',
        message: `Lỗi khi tạm dừng đối tượng qua API: ${err.message}`,
        error: err.message,
        isVerified: false,
      };
    }
  }
}
