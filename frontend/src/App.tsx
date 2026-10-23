import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { EmergencyStopBanner } from './components/layout/EmergencyStopBanner';
import { DashboardView } from './components/dashboard/DashboardView';
import { AccountsView } from './components/accounts/AccountsView';
import { CampaignsView } from './components/campaigns/CampaignsView';
import { RuleBuilderView } from './components/rules/RuleBuilderView';
import { SimulatorView } from './components/simulator/SimulatorView';
import { LogsView } from './components/logs/LogsView';
import { NotificationsModal } from './components/notifications/NotificationsModal';
import { ApiService } from './services/api';
import {
  AdAccount,
  CampaignSnapshot,
  CareRule,
  AutomationAction,
  NotificationItem,
  DashboardSummary,
  SystemStatus,
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSnapshot[]>([]);
  const [rules, setRules] = useState<CareRule[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load all initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accList, status, notifs] = await Promise.all([
        ApiService.getAccounts(),
        ApiService.getSystemStatus(),
        ApiService.getNotifications(),
      ]);

      setAccounts(accList);
      setSystemStatus(status);
      setNotifications(notifs.notifications);
      setUnreadCount(notifs.unreadCount);

      // Default to first account or keep selected
      let currentAcc = selectedAccount;
      if (!currentAcc && accList.length > 0) {
        currentAcc = accList[0];
        setSelectedAccount(currentAcc);
      }

      if (currentAcc) {
        const [hier, rls, acts, sum] = await Promise.all([
          ApiService.getHierarchy(currentAcc.id),
          ApiService.getRules(currentAcc.id),
          ApiService.getAutomationActions({ adAccountId: currentAcc.id }),
          ApiService.getDashboardSummary(currentAcc.id),
        ]);
        setCampaigns(hier);
        setRules(rls);
        setActions(acts);
        setSummary(sum);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    loadData();
    // Poll every 30 seconds for live updates
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle Account Change
  const handleSelectAccount = async (acc: AdAccount) => {
    setSelectedAccount(acc);
    setLoading(true);
    try {
      const [hier, rls, acts, sum] = await Promise.all([
        ApiService.getHierarchy(acc.id),
        ApiService.getRules(acc.id),
        ApiService.getAutomationActions({ adAccountId: acc.id }),
        ApiService.getDashboardSummary(acc.id),
      ]);
      setCampaigns(hier);
      setRules(rls);
      setActions(acts);
      setSummary(sum);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Emergency Stop toggle
  const handleToggleEmergencyStop = async (enable: boolean) => {
    setLoading(true);
    try {
      await ApiService.toggleEmergencyStop(enable);
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi chuyển trạng thái Emergency Stop: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual scheduler run
  const handleTriggerScheduler = async () => {
    setLoading(true);
    try {
      const res = await ApiService.triggerScheduler();
      alert(`Chu kỳ kiểm tra hoàn tất! Đã kiểm tra ${res.result.evaluatedCount} quy tắc.`);
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi kích hoạt scheduler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification read
  const handleMarkNotificationRead = async (id: string) => {
    try {
      await ApiService.markNotificationRead(id);
      const notifs = await ApiService.getNotifications();
      setNotifications(notifs.notifications);
      setUnreadCount(notifs.unreadCount);
    } catch (err: any) {
      console.error(err);
    }
  };

  const isMockMode = selectedAccount ? selectedAccount.isMock : true;
  const currency = selectedAccount?.currency || 'VND';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Emergency Stop Active Warning Banner */}
      <EmergencyStopBanner
        isActive={systemStatus?.emergencyStop || false}
        onDisable={() => handleToggleEmergencyStop(false)}
        loading={loading}
      />

      {/* Main Layout Shell */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          rulesCount={rules.length}
          isMockMode={isMockMode}
        />

        {/* Right Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Top Header */}
          <Header
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelectAccount={handleSelectAccount}
            emergencyStop={systemStatus?.emergencyStop || false}
            onToggleEmergencyStop={handleToggleEmergencyStop}
            onTriggerScheduler={handleTriggerScheduler}
            onRefreshData={loadData}
            unreadNotificationsCount={unreadCount}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            loading={loading}
          />

          {/* Main Tab Content */}
          <main className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
            {activeTab === 'dashboard' && (
              <DashboardView
                summary={summary}
                onNavigateTab={setActiveTab}
                currency={currency}
              />
            )}

            {activeTab === 'accounts' && (
              <AccountsView
                accounts={accounts}
                selectedAccount={selectedAccount}
                onSelectAccount={handleSelectAccount}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'campaigns' && (
              <CampaignsView
                campaigns={campaigns}
                currency={currency}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'rules' && (
              <RuleBuilderView
                rules={rules}
                accounts={accounts}
                selectedAccount={selectedAccount}
                onRefresh={loadData}
                onOpenSimulatorWithRule={(r) => setActiveTab('simulator')}
              />
            )}

            {activeTab === 'simulator' && (
              <SimulatorView
                rules={rules}
                selectedAccount={selectedAccount}
                currency={currency}
              />
            )}

            {activeTab === 'logs' && (
              <LogsView
                actions={actions}
                currency={currency}
                onRefresh={loadData}
              />
            )}
          </main>
        </div>
      </div>

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
      />
    </div>
  );
};

export default App;
