import prisma from '../../db.js';
import { MetaService } from './meta-service.js';
import { MockMetaMarketingApiClient } from './mock-meta-client.js';
import { MetricResolver } from './metric-resolver.js';
import { encryptToken } from '../../utils/encryption.js';

export class AccountSyncService {
  /**
   * Initializes or seeds default mock data for instant testing.
   */
  public static async seedMockAccountIfNeeded(userId: string): Promise<string> {
    const existingAccount = await prisma.adAccount.findFirst({
      where: { facebookAdAccountId: MockMetaMarketingApiClient.MOCK_ACCOUNT_ID },
    });

    if (existingAccount) {
      return existingAccount.id;
    }

    // 1. Create Mock Connected Account
    const connected = await prisma.connectedAccount.create({
      data: {
        userId,
        platform: 'META',
        metaUserId: 'mock_user_123',
        accountName: 'Meta Demo Developer Account',
        accessTokenEncrypted: encryptToken('mock_valid_token_value'),
        scopes: 'ads_read,ads_management,read_insights',
        isMock: true,
      },
    });

    // 2. Create Mock AdAccount
    const mockClient = MetaService.getMockClient();
    const mockAccounts = await mockClient.getAdAccounts('dummy');
    const firstAcc = mockAccounts[0];

    const adAccount = await prisma.adAccount.create({
      data: {
        connectedAccountId: connected.id,
        facebookAdAccountId: firstAcc.id,
        name: firstAcc.name,
        currency: firstAcc.currency,
        timezoneName: firstAcc.timezone_name,
        accountStatus: firstAcc.account_status,
        balance: parseFloat(firstAcc.balance || '0'),
        spendCap: parseFloat(firstAcc.spend_cap || '0'),
        minDailyBudget: firstAcc.min_daily_budget,
        isMock: true,
        isMonitored: true,
      },
    });

    // 3. Sync campaigns, adsets, ads & insights
    await this.syncAdAccount(adAccount.id);

    // 4. Create default recommended rule: "Tự động dừng quảng cáo tin nhắn chi phí cao"
    await prisma.careRule.create({
      data: {
        adAccountId: adAccount.id,
        name: 'Tự động dừng nhóm quảng cáo tin nhắn chi phí cao (> 100k)',
        scope: 'ADSET',
        targetMode: 'ALL_ACTIVE',
        targetEntityIds: '[]',
        metricType: 'COST_PER_MESSAGING',
        operator: 'GREATER_THAN',
        thresholdValue: 100000,
        currency: 'VND',
        reportingWindow: 'TODAY',
        minResults: 3,
        consecutiveViolationsRequired: 2,
        checkIntervalMinutes: 15,
        action: 'PAUSE',
        isDryRun: true, // Safe default!
        isEnabled: true,
      },
    });

    // Create 2nd rule: "Dừng quảng cáo đã tiêu > 200k nhưng 0 có tin nhắn"
    await prisma.careRule.create({
      data: {
        adAccountId: adAccount.id,
        name: 'Dừng đối tượng đã tiêu > 200.000 đ nhưng 0 tin nhắn',
        scope: 'ADSET',
        targetMode: 'ALL_ACTIVE',
        targetEntityIds: '[]',
        metricType: 'SPEND_WITHOUT_MESSAGES',
        operator: 'GREATER_THAN_OR_EQUAL',
        thresholdValue: 200000,
        minSpend: 200000,
        currency: 'VND',
        reportingWindow: 'TODAY',
        minResults: 0,
        consecutiveViolationsRequired: 1,
        checkIntervalMinutes: 30,
        action: 'PAUSE',
        isDryRun: true,
        isEnabled: true,
      },
    });

    return adAccount.id;
  }

  /**
   * Syncs all campaigns, adsets, ads and performance metrics for an ad account.
   */
  public static async syncAdAccount(adAccountId: string): Promise<void> {
    const { client, accessToken, fbAccountId } = await MetaService.getClientForAccount(adAccountId);

    // 1. Fetch campaigns
    const campaigns = await client.getCampaigns(fbAccountId, accessToken);

    for (const c of campaigns) {
      const campSnapshot = await prisma.campaignSnapshot.upsert({
        where: { fbCampaignId: c.id },
        update: {
          name: c.name,
          objective: c.objective,
          status: c.status,
          effectiveStatus: c.effective_status,
          dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) : null,
          lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) : null,
          lastSyncedAt: new Date(),
        },
        create: {
          adAccountId,
          fbCampaignId: c.id,
          name: c.name,
          objective: c.objective,
          status: c.status,
          effectiveStatus: c.effective_status,
          dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) : null,
          lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) : null,
        },
      });

      // Fetch campaign insight
      const rawCampInsight = await client.getInsights(c.id, 'campaign', 'today', accessToken);
      if (rawCampInsight) {
        const resolved = MetricResolver.resolve(rawCampInsight);
        await prisma.performanceMetric.create({
          data: {
            adAccountId,
            entityType: 'CAMPAIGN',
            entityId: c.id,
            datePreset: 'TODAY',
            spend: resolved.spend,
            impressions: resolved.impressions,
            clicks: resolved.clicks,
            cpm: resolved.cpm,
            cpc: resolved.cpc,
            ctr: resolved.ctr,
            messagingConversations: resolved.messagingConversations,
            costPerMessaging: resolved.costPerMessaging,
            leads: resolved.leads,
            purchases: resolved.purchases,
            rawActionData: JSON.stringify(rawCampInsight.actions || []),
          },
        });
      }
    }

    // 2. Fetch AdSets
    const adSets = await client.getAdSets(fbAccountId, accessToken);
    for (const s of adSets) {
      const campSnapshot = await prisma.campaignSnapshot.findUnique({
        where: { fbCampaignId: s.campaign_id },
      });

      if (!campSnapshot) continue;

      await prisma.adSetSnapshot.upsert({
        where: { fbAdSetId: s.id },
        update: {
          name: s.name,
          status: s.status,
          effectiveStatus: s.effective_status,
          dailyBudget: s.daily_budget ? parseFloat(s.daily_budget) : null,
          lifetimeBudget: s.lifetime_budget ? parseFloat(s.lifetime_budget) : null,
          billingEvent: s.billing_event,
          optimizationGoal: s.optimization_goal,
          lastSyncedAt: new Date(),
        },
        create: {
          campaignSnapshotId: campSnapshot.id,
          adAccountId,
          fbAdSetId: s.id,
          fbCampaignId: s.campaign_id,
          name: s.name,
          status: s.status,
          effectiveStatus: s.effective_status,
          dailyBudget: s.daily_budget ? parseFloat(s.daily_budget) : null,
          lifetimeBudget: s.lifetime_budget ? parseFloat(s.lifetime_budget) : null,
          billingEvent: s.billing_event,
          optimizationGoal: s.optimization_goal,
        },
      });

      // Fetch adset insight
      const rawAdSetInsight = await client.getInsights(s.id, 'adset', 'today', accessToken);
      if (rawAdSetInsight) {
        const resolved = MetricResolver.resolve(rawAdSetInsight);
        await prisma.performanceMetric.create({
          data: {
            adAccountId,
            entityType: 'ADSET',
            entityId: s.id,
            datePreset: 'TODAY',
            spend: resolved.spend,
            impressions: resolved.impressions,
            clicks: resolved.clicks,
            cpm: resolved.cpm,
            cpc: resolved.cpc,
            ctr: resolved.ctr,
            messagingConversations: resolved.messagingConversations,
            costPerMessaging: resolved.costPerMessaging,
            leads: resolved.leads,
            purchases: resolved.purchases,
            rawActionData: JSON.stringify(rawAdSetInsight.actions || []),
          },
        });
      }
    }

    // 3. Fetch Ads
    const ads = await client.getAds(fbAccountId, accessToken);
    for (const a of ads) {
      const adSetSnapshot = await prisma.adSetSnapshot.findUnique({
        where: { fbAdSetId: a.adset_id },
      });
      const campSnapshot = await prisma.campaignSnapshot.findUnique({
        where: { fbCampaignId: a.campaign_id },
      });

      if (!adSetSnapshot || !campSnapshot) continue;

      await prisma.adSnapshot.upsert({
        where: { fbAdId: a.id },
        update: {
          name: a.name,
          status: a.status,
          effectiveStatus: a.effective_status,
          lastSyncedAt: new Date(),
        },
        create: {
          adSetSnapshotId: adSetSnapshot.id,
          campaignSnapshotId: campSnapshot.id,
          adAccountId,
          fbAdId: a.id,
          fbAdSetId: a.adset_id,
          fbCampaignId: a.campaign_id,
          name: a.name,
          status: a.status,
          effectiveStatus: a.effective_status,
        },
      });

      // Fetch ad insight
      const rawAdInsight = await client.getInsights(a.id, 'ad', 'today', accessToken);
      if (rawAdInsight) {
        const resolved = MetricResolver.resolve(rawAdInsight);
        await prisma.performanceMetric.create({
          data: {
            adAccountId,
            entityType: 'AD',
            entityId: a.id,
            datePreset: 'TODAY',
            spend: resolved.spend,
            impressions: resolved.impressions,
            clicks: resolved.clicks,
            cpm: resolved.cpm,
            cpc: resolved.cpc,
            ctr: resolved.ctr,
            messagingConversations: resolved.messagingConversations,
            costPerMessaging: resolved.costPerMessaging,
            leads: resolved.leads,
            purchases: resolved.purchases,
            rawActionData: JSON.stringify(rawAdInsight.actions || []),
          },
        });
      }
    }
  }
}
