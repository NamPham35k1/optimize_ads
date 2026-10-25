export interface MetaInsightAction {
  action_type: string;
  value: string;
}

export interface MetaRawInsight {
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  actions?: MetaInsightAction[];
  cost_per_action_type?: MetaInsightAction[];
  date_start?: string;
  date_stop?: string;
}

export interface ResolvedMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  messagingConversations: number;
  costPerMessaging: number;
  leads: number;
  purchases: number;
  detectedMessagingActionType?: string;
  isZeroResults: boolean;
  hasSufficientData: boolean;
  costRevenuePercent?: number;
  dataQualityWarning?: string;
}

/**
 * MetricResolver: Resolves and computes accurate campaign metrics from Meta Graph API insights.
 * Handles different action_types and avoids misinterpreting generic clicks as messaging conversations.
 */
export class MetricResolver {
  // Priority list of action_types representing actual messaging conversations
  public static readonly MESSAGING_ACTION_TYPES = [
    'onsite_conversion.messaging_conversation_started_7d',
    'messaging_conversation_started_7d',
    'onsite_conversion.messaging_first_reply',
    'onsite_conversion.total_messaging_connection',
  ];

  public static readonly LEAD_ACTION_TYPES = [
    'lead',
    'onsite_conversion.lead_grouped',
    'offsite_conversion.fb_pixel_lead',
  ];

  public static readonly PURCHASE_ACTION_TYPES = [
    'purchase',
    'omni_purchase',
    'offsite_conversion.fb_pixel_purchase',
  ];

  /**
   * Resolves raw Meta Insights into normalized performance metrics.
   */
  public static resolve(raw: MetaRawInsight | null | undefined): ResolvedMetrics {
    if (!raw) {
      return {
        spend: 0,
        impressions: 0,
        clicks: 0,
        cpm: 0,
        cpc: 0,
        ctr: 0,
        messagingConversations: 0,
        costPerMessaging: 0,
        leads: 0,
        purchases: 0,
        isZeroResults: true,
        hasSufficientData: false,
        dataQualityWarning: 'No insight data available for selected period',
      };
    }

    const spend = parseFloat(raw.spend || '0');
    const impressions = parseInt(raw.impressions || '0', 10);
    const clicks = parseInt(raw.clicks || '0', 10);

    // Calculate or parse CPM, CPC, CTR
    const cpm = raw.cpm ? parseFloat(raw.cpm) : impressions > 0 ? (spend / impressions) * 1000 : 0;
    const cpc = raw.cpc ? parseFloat(raw.cpc) : clicks > 0 ? spend / clicks : 0;
    const ctr = raw.ctr ? parseFloat(raw.ctr) : impressions > 0 ? (clicks / impressions) * 100 : 0;

    // Resolve messaging actions
    let messagingConversations = 0;
    let detectedMessagingActionType: string | undefined = undefined;

    if (raw.actions && Array.isArray(raw.actions)) {
      for (const actionType of this.MESSAGING_ACTION_TYPES) {
        const found = raw.actions.find((a) => a.action_type === actionType);
        if (found) {
          messagingConversations = parseInt(found.value, 10);
          detectedMessagingActionType = actionType;
          break; // Stop at highest priority messaging action
        }
      }
    }

    // Resolve cost per messaging conversation
    let costPerMessaging = 0;
    if (messagingConversations > 0 && spend > 0) {
      // First check if Meta provided pre-calculated cost_per_action_type for this action
      if (detectedMessagingActionType && raw.cost_per_action_type) {
        const costItem = raw.cost_per_action_type.find(
          (c) => c.action_type === detectedMessagingActionType
        );
        if (costItem) {
          costPerMessaging = parseFloat(costItem.value);
        }
      }

      // Fallback to exact computation if not provided
      if (costPerMessaging === 0) {
        costPerMessaging = Math.round((spend / messagingConversations) * 100) / 100;
      }
    }

    // Resolve Leads
    let leads = 0;
    if (raw.actions) {
      for (const leadType of this.LEAD_ACTION_TYPES) {
        const found = raw.actions.find((a) => a.action_type === leadType);
        if (found) {
          leads = parseInt(found.value, 10);
          break;
        }
      }
    }

    // Resolve Purchases
    let purchases = 0;
    if (raw.actions) {
      for (const purchaseType of this.PURCHASE_ACTION_TYPES) {
        const found = raw.actions.find((a) => a.action_type === purchaseType);
        if (found) {
          purchases = parseInt(found.value, 10);
          break;
        }
      }
    }

    const isZeroResults = messagingConversations === 0;
    const hasSufficientData = impressions > 50 && (spend > 0 || clicks > 0);

    return {
      spend,
      impressions,
      clicks,
      cpm: Math.round(cpm * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      ctr: Math.round(ctr * 100) / 100,
      messagingConversations,
      costPerMessaging,
      leads,
      purchases,
      detectedMessagingActionType,
      isZeroResults,
      hasSufficientData,
      dataQualityWarning: !hasSufficientData ? 'Dữ liệu chưa đủ ngưỡng thống kê tin cậy' : undefined,
    };
  }

  /**
   * Helper to evaluate a specific metric value by name.
   */
  public static extractValueByMetricType(
    metrics: ResolvedMetrics,
    metricType: string
  ): number {
    switch (metricType) {
      case 'COST_PER_MESSAGING':
        return metrics.costPerMessaging;
      case 'SPEND_WITHOUT_MESSAGES':
        return metrics.messagingConversations === 0 ? metrics.spend : 0;
      case 'CPM':
        return metrics.cpm;
      case 'CPC':
        return metrics.cpc;
      case 'CTR':
        return metrics.ctr;
      case 'TOTAL_SPEND':
        return metrics.spend;
      case 'ADS_COST_REVENUE_PERCENT':
        return metrics.costRevenuePercent || 0;
      case 'MESSAGING_COUNT':
        return metrics.messagingConversations;
      default:
        return 0;
    }
  }
}
