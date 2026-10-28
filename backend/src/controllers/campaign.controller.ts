import { Request, Response } from 'express';
import prisma from '../db.js';
import { MetaService } from '../services/meta-api/meta-service.js';

export class CampaignController {
  public static async getHierarchy(req: Request, res: Response): Promise<void> {
    try {
      const { adAccountId } = req.query;

      const whereClause = adAccountId ? { adAccountId: String(adAccountId) } : {};

      const campaigns = await prisma.campaignSnapshot.findMany({
        where: whereClause,
        include: {
          adSetSnapshots: {
            include: {
              adSnapshots: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Fetch latest performance metrics for all entities
      const metrics = await prisma.performanceMetric.findMany({
        where: {
          ...whereClause,
          datePreset: 'TODAY',
        },
        orderBy: { fetchedAt: 'desc' },
      });

      const metricsMap = new Map<string, any>();
      for (const m of metrics) {
        if (!metricsMap.has(m.entityId)) {
          metricsMap.set(m.entityId, m);
        }
      }

      // Attach metrics to tree
      const hierarchy = campaigns.map((camp) => {
        const campMetric = metricsMap.get(camp.fbCampaignId) || {
          spend: 0,
          messagingConversations: 0,
          costPerMessaging: 0,
          cpm: 0,
          cpc: 0,
          ctr: 0,
          impressions: 0,
          clicks: 0,
        };

        const adSets = camp.adSetSnapshots.map((adSet) => {
          const adSetMetric = metricsMap.get(adSet.fbAdSetId) || {
            spend: 0,
            messagingConversations: 0,
            costPerMessaging: 0,
            cpm: 0,
            cpc: 0,
            ctr: 0,
            impressions: 0,
            clicks: 0,
          };

          const ads = adSet.adSnapshots.map((ad) => {
            const adMetric = metricsMap.get(ad.fbAdId) || {
              spend: 0,
              messagingConversations: 0,
              costPerMessaging: 0,
              cpm: 0,
              cpc: 0,
              ctr: 0,
              impressions: 0,
              clicks: 0,
            };

            return {
              ...ad,
              metrics: adMetric,
            };
          });

          return {
            ...adSet,
            metrics: adSetMetric,
            ads,
          };
        });

        return {
          ...camp,
          metrics: campMetric,
          adSets,
        };
      });

      res.json({ success: true, data: hierarchy });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async toggleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { adAccountId, entityId, entityType, status } = req.body;

      if (!adAccountId || !entityId || !entityType || !status) {
        res.status(400).json({ success: false, error: 'Thiếu thông tin yêu cầu (adAccountId, entityId, entityType, status)' });
        return;
      }

      if (status !== 'ACTIVE' && status !== 'PAUSED') {
        res.status(400).json({ success: false, error: 'Trạng thái chỉ có thể là ACTIVE hoặc PAUSED' });
        return;
      }

      const { client, accessToken } = await MetaService.getClientForAccount(adAccountId);
      const level = entityType.toLowerCase() as 'campaign' | 'adset' | 'ad';

      const result = await client.updateEntityStatus(entityId, level, status, accessToken);

      // Update in local DB snapshot
      if (level === 'campaign') {
        await prisma.campaignSnapshot.updateMany({
          where: { fbCampaignId: entityId },
          data: { status, isPausedBySystem: false },
        });
      } else if (level === 'adset') {
        await prisma.adSetSnapshot.updateMany({
          where: { fbAdSetId: entityId },
          data: { status, isPausedBySystem: false },
        });
      } else if (level === 'ad') {
        await prisma.adSnapshot.updateMany({
          where: { fbAdId: entityId },
          data: { status, isPausedBySystem: false },
        });
      }

      res.json({
        success: true,
        data: {
          entityId,
          entityType,
          status,
          effectiveStatus: result.effectiveStatus,
          message: `Đã chuyển ${entityType} sang ${status === 'ACTIVE' ? 'ĐANG CHẠY' : 'TẠM DỪNG'}`,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
