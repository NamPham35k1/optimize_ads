import axios from 'axios';
import {
  AdAccount,
  CampaignSnapshot,
  CareRule,
  AutomationAction,
  NotificationItem,
  DashboardSummary,
  SystemStatus,
  User,
  PancakeShop,
  PancakeFinancialStats,
} from '../types';

export const DEFAULT_RENDER_URL = 'https://optimize-ads.onrender.com';

export function getCustomBackendUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('autoads_backend_url');
    if (saved && saved.trim()) return saved.trim();
  }
  return '';
}

export function setCustomBackendUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('autoads_backend_url', url.trim());
    } else {
      localStorage.removeItem('autoads_backend_url');
    }
  }
}

export function getEffectiveBackendUrl(): string {
  const custom = getCustomBackendUrl();
  if (custom) return custom;

  const envUrl = (import.meta.env.VITE_API_URL as string || '').trim();
  if (envUrl) return envUrl;

  // If in browser on non-localhost (Vercel, custom domain, etc.)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    if (!isLocalhost) {
      return DEFAULT_RENDER_URL;
    }
  }

  return '';
}

export function getApiBaseUrl(): string {
  const base = getEffectiveBackendUrl().replace(/\/+$/, '');
  if (!base) return '/api';
  return base.endsWith('/api') ? base : `${base}/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000, // 60s to accommodate Render free instance cold starts (30-50s)
});

// Interceptor to inject dynamic baseURL and Authorization Bearer token
api.interceptors.request.use((reqConfig) => {
  reqConfig.baseURL = getApiBaseUrl();
  const token = localStorage.getItem('autoads_auth_token');
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Interceptor to catch HTML responses (when backend is down or 404 rewrite to index.html)
api.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
      return Promise.reject(new Error('Backend API không khả dụng (nhận về HTML).'));
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const ApiService = {
  // Accounts
  async getAccounts(): Promise<AdAccount[]> {
    const res = await api.get('/accounts');
    return res.data.data;
  },

  async connectAccount(accessToken: string, accountName?: string) {
    const res = await api.post('/accounts/connect', { accessToken, accountName });
    return res.data;
  },

  async syncAccount(id: string) {
    const res = await api.post(`/accounts/${id}/sync`);
    return res.data;
  },

  async deleteAccount(id: string) {
    const res = await api.delete(`/accounts/${id}`);
    return res.data;
  },

  async purgeMock() {
    const res = await api.post('/accounts/purge-mock');
    return res.data;
  },


  // Campaigns Hierarchy
  async getHierarchy(adAccountId?: string): Promise<CampaignSnapshot[]> {
    const res = await api.get('/campaigns/hierarchy', {
      params: { adAccountId },
    });
    return res.data.data;
  },

  async toggleEntityStatus(payload: {
    adAccountId: string;
    entityId: string;
    entityType: 'campaign' | 'adset' | 'ad';
    status: 'ACTIVE' | 'PAUSED';
  }): Promise<any> {
    const res = await api.post('/campaigns/toggle-status', payload);
    return res.data;
  },

  // Rules
  async getRules(adAccountId?: string): Promise<CareRule[]> {
    const res = await api.get('/rules', {
      params: { adAccountId },
    });
    return res.data.data;
  },

  async createRule(payload: Partial<CareRule>) {
    const res = await api.post('/rules', payload);
    return res.data;
  },

  async updateRule(id: string, payload: Partial<CareRule>) {
    const res = await api.put(`/rules/${id}`, payload);
    return res.data;
  },

  async toggleRuleEnabled(id: string) {
    const res = await api.patch(`/rules/${id}/toggle-enabled`);
    return res.data;
  },

  async toggleLiveMode(id: string, isDryRun: boolean, confirmLiveMode = false) {
    const res = await api.patch(`/rules/${id}/toggle-live-mode`, {
      isDryRun,
      confirmLiveMode,
    });
    return res.data;
  },

  async deleteRule(id: string) {
    const res = await api.delete(`/rules/${id}`);
    return res.data;
  },

  async simulateRule(payload: any) {
    const res = await api.post('/rules/simulate', payload);
    return res.data.data;
  },

  async evaluateRuleNow(id: string) {
    const res = await api.post(`/rules/${id}/evaluate-now`);
    return res.data;
  },

  // Audit Actions & History
  async getAutomationActions(params?: {
    adAccountId?: string;
    status?: string;
    limit?: number;
  }): Promise<AutomationAction[]> {
    const res = await api.get('/audit/actions', { params });
    return res.data.data;
  },

  // Notifications
  async getNotifications(): Promise<{
    notifications: NotificationItem[];
    unreadCount: number;
  }> {
    const res = await api.get('/notifications');
    return {
      notifications: res.data.data,
      unreadCount: res.data.unreadCount,
    };
  },

  async markNotificationRead(id: string) {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  // System & Dashboard
  async getSystemStatus(): Promise<SystemStatus> {
    const res = await api.get('/system/status');
    return res.data.data;
  },

  async toggleEmergencyStop(enabled: boolean) {
    const res = await api.post('/system/emergency-stop', { enabled });
    return res.data;
  },

  async triggerScheduler() {
    const res = await api.post('/system/trigger-scheduler');
    return res.data;
  },

  // Telegram Mobile Alert & Remote Control
  async getTelegramConfig(): Promise<{
    botToken: string;
    chatId: string;
    isEnabled: boolean;
    periodicEnabled: boolean;
    periodicIntervalMinutes: number;
    maskedToken: string;
  }> {
    const res = await api.get('/telegram/config');
    return res.data.data;
  },

  async updateTelegramConfig(data: {
    botToken?: string;
    chatId?: string;
    isEnabled?: boolean;
    periodicEnabled?: boolean;
    periodicIntervalMinutes?: number;
  }) {
    const res = await api.post('/telegram/config', data);
    return res.data;
  },

  async testTelegram(data: { botToken?: string; chatId?: string }) {
    const res = await api.post('/telegram/test', data);
    return res.data;
  },

  async sendTelegramReportNow() {
    const res = await api.post('/telegram/report-now');
    return res.data;
  },

  async getDashboardSummary(adAccountId?: string): Promise<DashboardSummary> {
    const res = await api.get('/dashboard/summary', {
      params: { adAccountId },
    });
    return res.data.data;
  },

  // Authentication & Sub-Account Management
  async login(email: string, password?: string): Promise<{ token: string; user: User }> {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.data?.token) {
      localStorage.setItem('autoads_auth_token', res.data.data.token);
    }
    return res.data.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get('/auth/me');
    return res.data.data;
  },

  logout() {
    localStorage.removeItem('autoads_auth_token');
  },

  async getUsers(): Promise<User[]> {
    const res = await api.get('/users');
    return res.data.data;
  },

  async createUser(data: {
    name: string;
    email: string;
    password?: string;
    role?: string;
    assignedAdAccountIds?: string[];
  }): Promise<User> {
    const res = await api.post('/users', data);
    return res.data.data;
  },

  async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      isActive?: boolean;
      assignedAdAccountIds?: string[];
    }
  ): Promise<User> {
    const res = await api.put(`/users/${id}`, data);
    return res.data.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  // POS Pancake & Financial Analytics
  async getPancakeShops(adAccountId?: string): Promise<PancakeShop[]> {
    const res = await api.get('/pancake/shops', { params: { adAccountId } });
    return res.data.data;
  },

  async connectPancakeShop(data: {
    name: string;
    shopId: string;
    apiToken: string;
    pageId?: string;
    adAccountId?: string;
    targetCostPercent?: number;
    warningCostPercent?: number;
    dangerCostPercent?: number;
  }): Promise<PancakeShop> {
    const res = await api.post('/pancake/shops', data);
    return res.data.data;
  },

  async syncPancakeShop(id: string): Promise<{ syncedCount: number }> {
    const res = await api.post(`/pancake/shops/${id}/sync`);
    return res.data.data;
  },

  async deletePancakeShop(id: string): Promise<void> {
    await api.delete(`/pancake/shops/${id}`);
  },

  async getPancakeStats(adAccountId: string): Promise<PancakeFinancialStats> {
    const res = await api.get('/pancake/stats', { params: { adAccountId } });
    return res.data.data;
  },

  async seedMockPancake(adAccountId: string, shopName?: string): Promise<any> {
    const res = await api.post('/pancake/seed-mock', { adAccountId, shopName });
    return res.data;
  },

  // Backend Health Ping & URL Configuration Helpers
  async pingHealth(): Promise<boolean> {
    try {
      const base = getEffectiveBackendUrl().replace(/\/+$/, '');
      const healthUrl = base ? `${base}/health` : '/health';
      const res = await axios.get(healthUrl, { timeout: 15000 });
      return res.status === 200 && (res.data?.status === 'ok' || res.data?.app === 'Auto Ads Care');
    } catch {
      try {
        const res = await api.get('/system/status', { timeout: 15000 });
        return res.status === 200 && res.data?.success === true;
      } catch {
        return false;
      }
    }
  },

  getEffectiveBackendUrl,
  getCustomBackendUrl,
  setCustomBackendUrl,
  DEFAULT_RENDER_URL,
};
