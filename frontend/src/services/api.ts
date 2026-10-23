import axios from 'axios';
import {
  AdAccount,
  CampaignSnapshot,
  CareRule,
  AutomationAction,
  NotificationItem,
  DashboardSummary,
  SystemStatus,
} from '../types';

const apiBase = import.meta.env.VITE_API_URL
  ? `${(import.meta.env.VITE_API_URL as string).replace(/\/+$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  timeout: 20000,
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

  async seedMockAccount() {
    const res = await api.post('/accounts/seed-mock');
    return res.data;
  },

  // Campaigns Hierarchy
  async getHierarchy(adAccountId?: string): Promise<CampaignSnapshot[]> {
    const res = await api.get('/campaigns/hierarchy', {
      params: { adAccountId },
    });
    return res.data.data;
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

  async getDashboardSummary(adAccountId?: string): Promise<DashboardSummary> {
    const res = await api.get('/dashboard/summary', {
      params: { adAccountId },
    });
    return res.data.data;
  },
};
