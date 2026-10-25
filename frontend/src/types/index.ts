export interface AdAccount {
  id: string;
  connectedAccountId: string;
  facebookAdAccountId: string;
  name: string;
  currency: string;
  timezoneName: string;
  accountStatus: number;
  balance: number;
  spendCap?: number;
  minDailyBudget?: number;
  isMonitored: boolean;
  isMock: boolean;
  connectedAccount?: {
    id: string;
    accountName: string;
    scopes: string;
    isValid: boolean;
    lastVerifiedAt: string;
    isMock: boolean;
  };
  _count?: {
    campaignSnapshots: number;
    careRules: number;
  };
}

export interface PerformanceMetric {
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  messagingConversations: number;
  costPerMessaging: number;
  leads?: number;
  purchases?: number;
}

export interface AdSnapshot {
  id: string;
  fbAdId: string;
  name: string;
  status: string;
  effectiveStatus: string;
  isPausedBySystem: boolean;
  metrics?: PerformanceMetric;
}

export interface AdSetSnapshot {
  id: string;
  fbAdSetId: string;
  name: string;
  status: string;
  effectiveStatus: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  isPausedBySystem: boolean;
  metrics?: PerformanceMetric;
  ads: AdSnapshot[];
}

export interface CampaignSnapshot {
  id: string;
  fbCampaignId: string;
  name: string;
  objective: string;
  status: string;
  effectiveStatus: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  isPausedBySystem: boolean;
  metrics?: PerformanceMetric;
  adSets: AdSetSnapshot[];
}

export interface CareRule {
  id: string;
  adAccountId: string;
  name: string;
  scope: 'CAMPAIGN' | 'ADSET' | 'AD';
  targetMode: 'ALL_ACTIVE' | 'SELECTED';
  targetEntityIds: string; // JSON array
  metricType: string;
  operator: 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL';
  thresholdValue: number;
  currency: string;
  reportingWindow: string;
  minResults: number;
  minSpend: number;
  consecutiveViolationsRequired: number;
  checkIntervalMinutes: number;
  action: 'PAUSE' | 'NOTIFY_ONLY';
  isDryRun: boolean;
  isEnabled: boolean;
  currentConsecutiveViolations: number;
  lastCheckedAt?: string;
  lastViolatedAt?: string;
  adAccount?: {
    name: string;
    currency: string;
    isMock: boolean;
  };
  _count?: {
    ruleEvaluations: number;
    automationActions: number;
  };
}

export interface AutomationAction {
  id: string;
  ruleId: string;
  adAccountId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  actionType: string;
  status: 'SUCCESS' | 'DRY_RUN' | 'FAILED' | 'BLOCKED_BY_SAFETY' | 'SKIPPED';
  preActionStatus?: string;
  postActionStatus?: string;
  apiResponse?: string;
  errorMessage?: string;
  isVerified: boolean;
  executedAt: string;
  rule?: {
    name: string;
    isDryRun: boolean;
  };
  adAccount?: {
    name: string;
  };
}

export interface NotificationItem {
  id: string;
  adAccountId?: string;
  ruleId?: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  isRead: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  todaySpend: number;
  totalSpendPeriod: number;
  totalMessages: number;
  avgCostPerMessaging: number;
  activeCampaigns: number;
  pausedCampaigns: number;
  autoPausedCampaigns: number;
  thresholdExceededRulesCount: number;
  activeRulesCount: number;
  chartData: Array<{
    date: string;
    spend: number;
    messages: number;
    costPerMsg: number;
  }>;
}

export interface SystemStatus {
  emergencyStop: boolean;
  schedulerCron: string;
  apiVersion: string;
  hasAccounts: boolean;
  activeRulesCount: number;
  nodeEnv: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUB_ACCOUNT';
  isActive: boolean;
  createdAt: string;
  assignedAdAccountIds?: string[];
  assignedAdAccounts?: Array<{
    id: string;
    name: string;
    facebookAdAccountId: string;
    currency?: string;
  }>;
}

export interface PancakeShop {
  id: string;
  adAccountId?: string;
  name: string;
  shopId: string;
  apiToken: string;
  pageId?: string;
  isActive: boolean;
  targetCostPercent: number; // <= 35% An toan
  warningCostPercent: number; // 35% - 40% Canh bao
  dangerCostPercent: number; // > 50% Nguy hiem
  createdAt: string;
  updatedAt: string;
  adAccount?: {
    id: string;
    name: string;
    facebookAdAccountId: string;
  };
  _count?: {
    orders: number;
  };
}

export interface PancakeOrder {
  id: string;
  shopId: string;
  pancakeOrderId: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  status: string;
  fbCampaignId?: string;
  orderCreatedAt: string;
}

export interface PancakeFinancialStats {
  adAccountId: string;
  adAccountName: string;
  currency: string;
  totalAdsSpend: number;
  totalRevenue: number;
  orderCount: number;
  profit: number;
  costRevenuePercent: number;
  status: 'SAFE' | 'WARNING' | 'DANGER';
  statusLabel: string;
  campaigns: Array<{
    campaignId: string;
    campaignName: string;
    spend: number;
    revenue: number;
    orders: number;
    profit: number;
    costRevenuePercent: number;
    status: 'SAFE' | 'WARNING' | 'DANGER';
  }>;
}
