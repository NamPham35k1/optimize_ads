import { IMetaClient, MetaAdAccount, MetaCampaign, MetaAdSet, MetaAd } from './meta-client.js';
import { MetaRawInsight } from './metric-resolver.js';

export class MockMetaMarketingApiClient implements IMetaClient {
  public static readonly MOCK_ACCOUNT_ID = 'act_mock_987654321';

  private accounts: MetaAdAccount[] = [
    {
      id: MockMetaMarketingApiClient.MOCK_ACCOUNT_ID,
      name: '[MOCK] Shop Thời Trang GenZ (Demo Account)',
      account_status: 1, // ACTIVE
      currency: 'VND',
      timezone_name: 'Asia/Ho_Chi_Minh',
      balance: '1500000',
      spend_cap: '10000000',
      min_daily_budget: 20000,
    },
  ];

  private campaigns: MetaCampaign[] = [
    {
      id: 'mock_camp_001',
      name: '[MOCK] Chiến Dịch Tin Nhắn - Áo Thun Local Brand (CPA Cao)',
      objective: 'OUTCOME_MESSAGES',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      daily_budget: '500000',
    },
    {
      id: 'mock_camp_002',
      name: '[MOCK] Chiến Dịch Khách Mới - Váy Nữ Thiết Kế (Hiệu Quả Tốt)',
      objective: 'OUTCOME_MESSAGES',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      daily_budget: '400000',
    },
    {
      id: 'mock_camp_003',
      name: '[MOCK] Chiến Dịch Test Mẫu Hoodie Q2 (0 Tin Nhắn - Tiêu Nhiều)',
      objective: 'OUTCOME_MESSAGES',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      daily_budget: '300000',
    },
    {
      id: 'mock_camp_004',
      name: '[MOCK] Chiến Dịch Vừa Bật - Phụ Kiện (Chưa Đủ Dữ Liệu)',
      objective: 'OUTCOME_MESSAGES',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      daily_budget: '200000',
    },
  ];

  private adSets: MetaAdSet[] = [
    {
      id: 'mock_adset_001',
      campaign_id: 'mock_camp_001',
      name: '[MOCK] Nhóm Hà Nội 18-24 - Sở thích Thời Trang (Vi Phạm 225k/tin)',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      daily_budget: '250000',
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'MESSAGING_CONVERSATION_STARTED_7D',
    },
    {
      id: 'mock_adset_002',
      campaign_id: 'mock_camp_001',
      name: '[MOCK] Nhóm TP.HCM 20-30 - Sở thích Streetwear (Vi Phạm 180k/tin)',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      daily_budget: '250000',
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'MESSAGING_CONVERSATION_STARTED_7D',
    },
    {
      id: 'mock_adset_003',
      campaign_id: 'mock_camp_002',
      name: '[MOCK] Nhóm Toàn Quốc Nữ 22-28 - Mua sắm Online (Tốt 53k/tin)',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      daily_budget: '400000',
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'MESSAGING_CONVERSATION_STARTED_7D',
    },
    {
      id: 'mock_adset_004',
      campaign_id: 'mock_camp_003',
      name: '[MOCK] Nhóm Mùa Thu 18-25 (0 Tin Nhắn - Tiêu 220k)',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      daily_budget: '300000',
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'MESSAGING_CONVERSATION_STARTED_7D',
    },
    {
      id: 'mock_adset_005',
      campaign_id: 'mock_camp_004',
      name: '[MOCK] Nhóm Vừa Bật - Mới tiêu 15k (Chưa đủ đánh giá)',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      daily_budget: '200000',
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'MESSAGING_CONVERSATION_STARTED_7D',
    },
  ];

  private ads: MetaAd[] = [
    {
      id: 'mock_ad_001',
      adset_id: 'mock_adset_001',
      campaign_id: 'mock_camp_001',
      name: '[MOCK] Video Review Mẫu Áo Phông Đen',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
    },
    {
      id: 'mock_ad_002',
      adset_id: 'mock_adset_002',
      campaign_id: 'mock_camp_001',
      name: '[MOCK] Carousel Ảnh Bộ Sưu Tập Streetwear',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
    },
    {
      id: 'mock_ad_003',
      adset_id: 'mock_adset_003',
      campaign_id: 'mock_camp_002',
      name: '[MOCK] Ảnh Lookbook Váy Nữ Thiết Kế Đỏ',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
    },
    {
      id: 'mock_ad_004',
      adset_id: 'mock_adset_004',
      campaign_id: 'mock_camp_003',
      name: '[MOCK] Video Teaser Hoodie Mùa Thu',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
    },
  ];

  // In-memory mock insight database
  private insights: Record<string, MetaRawInsight> = {
    // Campaign level insights
    mock_camp_001: {
      spend: '450000',
      impressions: '14200',
      clicks: '310',
      cpm: '31690',
      cpc: '1451',
      ctr: '2.18',
      actions: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '2' },
        { action_type: 'onsite_conversion.messaging_first_reply', value: '2' },
        { action_type: 'link_click', value: '310' },
      ],
      cost_per_action_type: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '225000' },
      ],
    },
    mock_camp_002: {
      spend: '320000',
      impressions: '16800',
      clicks: '580',
      cpm: '19047',
      cpc: '551',
      ctr: '3.45',
      actions: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '6' },
        { action_type: 'link_click', value: '580' },
      ],
      cost_per_action_type: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '53333' },
      ],
    },
    mock_camp_003: {
      spend: '220000',
      impressions: '8900',
      clicks: '110',
      cpm: '24719',
      cpc: '2000',
      ctr: '1.23',
      actions: [
        { action_type: 'link_click', value: '110' },
      ], // 0 messaging conversations!
      cost_per_action_type: [],
    },
    mock_camp_004: {
      spend: '15000',
      impressions: '250',
      clicks: '4',
      cpm: '60000',
      cpc: '3750',
      ctr: '1.60',
      actions: [],
      cost_per_action_type: [],
    },

    // AdSet level insights
    mock_adset_001: {
      spend: '225000',
      impressions: '7100',
      clicks: '150',
      actions: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '1' },
      ],
      cost_per_action_type: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '225000' },
      ],
    },
    mock_adset_002: {
      spend: '225000',
      impressions: '7100',
      clicks: '160',
      actions: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '1' },
      ],
      cost_per_action_type: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '225000' },
      ],
    },
    mock_adset_003: {
      spend: '320000',
      impressions: '16800',
      clicks: '580',
      actions: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '6' },
      ],
      cost_per_action_type: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '53333' },
      ],
    },
    mock_adset_004: {
      spend: '220000',
      impressions: '8900',
      clicks: '110',
      actions: [],
      cost_per_action_type: [],
    },
    mock_adset_005: {
      spend: '15000',
      impressions: '250',
      clicks: '4',
      actions: [],
      cost_per_action_type: [],
    },

    // Ad level insights
    mock_ad_001: {
      spend: '225000',
      impressions: '7100',
      clicks: '150',
      actions: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '1' },
      ],
      cost_per_action_type: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '225000' },
      ],
    },
    mock_ad_002: {
      spend: '225000',
      impressions: '7100',
      clicks: '160',
      actions: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '1' },
      ],
      cost_per_action_type: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '225000' },
      ],
    },
    mock_ad_003: {
      spend: '320000',
      impressions: '16800',
      clicks: '580',
      actions: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '6' },
      ],
      cost_per_action_type: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '53333' },
      ],
    },
    mock_ad_004: {
      spend: '220000',
      impressions: '8900',
      clicks: '110',
      actions: [],
      cost_per_action_type: [],
    },
  };

  public async debugToken(accessToken: string) {
    return {
      isValid: true,
      scopes: ['ads_read', 'ads_management', 'read_insights'],
      expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000), // 60 days
      userId: 'mock_meta_user_999',
    };
  }

  public async getAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
    return this.accounts;
  }

  public async getCampaigns(adAccountId: string, accessToken: string): Promise<MetaCampaign[]> {
    return this.campaigns;
  }

  public async getAdSets(adAccountId: string, accessToken: string): Promise<MetaAdSet[]> {
    return this.adSets;
  }

  public async getAds(adAccountId: string, accessToken: string): Promise<MetaAd[]> {
    return this.ads;
  }

  public async getInsights(
    entityId: string,
    level: 'campaign' | 'adset' | 'ad',
    datePreset = 'today',
    accessToken?: string
  ): Promise<MetaRawInsight | null> {
    return this.insights[entityId] || null;
  }

  public async getAccountInsights(
    adAccountId: string,
    level: 'campaign' | 'adset' | 'ad',
    datePreset = 'today',
    accessToken?: string
  ): Promise<Record<string, MetaRawInsight>> {
    return { ...this.insights };
  }

  public async getEntityStatus(
    entityId: string,
    level: 'campaign' | 'adset' | 'ad',
    accessToken: string
  ): Promise<{ status: string; effectiveStatus: string }> {
    if (level === 'campaign') {
      const camp = this.campaigns.find((c) => c.id === entityId);
      return { status: camp?.status || 'UNKNOWN', effectiveStatus: camp?.effective_status || 'UNKNOWN' };
    } else if (level === 'adset') {
      const set = this.adSets.find((s) => s.id === entityId);
      return { status: set?.status || 'UNKNOWN', effectiveStatus: set?.effective_status || 'UNKNOWN' };
    } else {
      const ad = this.ads.find((a) => a.id === entityId);
      return { status: ad?.status || 'UNKNOWN', effectiveStatus: ad?.effective_status || 'UNKNOWN' };
    }
  }

  public async updateEntityStatus(
    entityId: string,
    level: 'campaign' | 'adset' | 'ad',
    status: 'ACTIVE' | 'PAUSED',
    accessToken?: string
  ): Promise<{ success: boolean; effectiveStatus: string; apiResponse: any }> {
    console.log(`[MOCK MetaAPI] Updated ${level} ID: ${entityId} to ${status}`);

    if (level === 'campaign') {
      const c = this.campaigns.find((item) => item.id === entityId);
      if (c) {
        c.status = status;
        c.effective_status = status;
      }
    } else if (level === 'adset') {
      const s = this.adSets.find((item) => item.id === entityId);
      if (s) {
        s.status = status;
        s.effective_status = status;
      }
    } else if (level === 'ad') {
      const a = this.ads.find((item) => item.id === entityId);
      if (a) {
        a.status = status;
        a.effective_status = status;
      }
    }

    return {
      success: true,
      effectiveStatus: status,
      apiResponse: { success: true, mock: true, timestamp: new Date().toISOString() },
    };
  }

  public async pauseEntity(
    entityId: string,
    level: 'campaign' | 'adset' | 'ad',
    accessToken: string
  ): Promise<{ success: boolean; effectiveStatus: string; apiResponse: any }> {
    return this.updateEntityStatus(entityId, level, 'PAUSED', accessToken);
  }
}
