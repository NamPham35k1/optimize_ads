import { Request, Response } from 'express';
import prisma from '../db.js';

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
}
