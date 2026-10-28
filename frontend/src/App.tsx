import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { BackendConnectionBanner, ConnectionState } from './components/layout/BackendConnectionBanner';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { EmergencyStopBanner } from './components/layout/EmergencyStopBanner';
import { DashboardView } from './components/dashboard/DashboardView';
import { AccountsView } from './components/accounts/AccountsView';
import { CampaignsView } from './components/campaigns/CampaignsView';
import { RuleBuilderView } from './components/rules/RuleBuilderView';
import { SimulatorView } from './components/simulator/SimulatorView';
import { LogsView } from './components/logs/LogsView';
import { PancakeView } from './components/pancake/PancakeView';
import { TelegramView } from './components/telegram/TelegramView';
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
  User,
  PancakeFinancialStats,
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
  const [pancakeStats, setPancakeStats] = useState<PancakeFinancialStats | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [backendError, setBackendError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer for connection countdown / elapsed time
  useEffect(() => {
    let timer: any = null;
    if (connectionState === 'connecting') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [connectionState]);

  // Load all initial data
  const loadData = useCallback(async (isRetry = false) => {
    setLoading(true);
    if (isRetry) {
      setConnectionState('connecting');
      setElapsedSeconds(0);
    }
    try {
      const [accList, status, notifs, userMe] = await Promise.all([
        ApiService.getAccounts().catch(() => null),
        ApiService.getSystemStatus().catch(() => null),
        ApiService.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 })),
        ApiService.getMe().catch(() => null),
      ]);

      const safeAccounts = Array.isArray(accList) ? accList : [];
      setAccounts(safeAccounts);
      setSystemStatus(status);
      setNotifications(notifs?.notifications || []);
      setUnreadCount(notifs?.unreadCount || 0);
      if (userMe) setCurrentUser(userMe);

      const isConnected = status !== null || accList !== null;
      if (!isConnected) {
        setBackendError('Chưa kết nối máy chủ Backend. Giao diện đang chạy độc lập.');
        setConnectionState('error');
      } else {
        setBackendError(null);
        setConnectionState((prev) => (prev === 'connecting' ? 'connected' : prev));
        // Auto-dismiss connected banner after 3.5s
        setTimeout(() => {
          setConnectionState((cur) => (cur === 'connected' ? 'idle' : cur));
        }, 3500);
      }

      // Default to first account or keep selected
      let currentAcc = selectedAccount;
      if (!currentAcc && safeAccounts.length > 0) {
        currentAcc = safeAccounts[0];
        setSelectedAccount(currentAcc);
      }

      if (currentAcc) {
        const [hier, rls, acts, sum, pStats] = await Promise.all([
          ApiService.getHierarchy(currentAcc.id).catch(() => []),
          ApiService.getRules(currentAcc.id).catch(() => []),
          ApiService.getAutomationActions({ adAccountId: currentAcc.id }).catch(() => []),
          ApiService.getDashboardSummary(currentAcc.id).catch(() => null),
          ApiService.getPancakeStats(currentAcc.id).catch(() => null),
        ]);
        setCampaigns(Array.isArray(hier) ? hier : []);
        setRules(Array.isArray(rls) ? rls : []);
        setActions(Array.isArray(acts) ? acts : []);
        setSummary(sum);
        setPancakeStats(pStats);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setBackendError('Không thể kết nối Backend API.');
      setConnectionState('error');
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  // Active retry and wake-up handler for Render
  const handleWakeUpAndConnect = useCallback(async () => {
    setConnectionState('connecting');
    setElapsedSeconds(0);
    setLoading(true);

    const maxWaitSeconds = 60;
    const startTime = Date.now();
    let connected = false;

    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      try {
        const ok = await ApiService.pingHealth();
        if (ok) {
          connected = true;
          break;
        }
      } catch {
        // Keep waiting for Render to wake up
      }
      await new Promise((r) => setTimeout(r, 3500));
    }

    await loadData(false);
    if (!connected) {
      setConnectionState('error');
    }
  }, [loadData]);

  useEffect(() => {
    handleWakeUpAndConnect();
    // Poll every 30 seconds for live updates
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [handleWakeUpAndConnect, loadData]);

  // Handle Account Change
  const handleSelectAccount = async (acc: AdAccount) => {
    setSelectedAccount(acc);
    setLoading(true);
    try {
      const [hier, rls, acts, sum, pStats] = await Promise.all([
        ApiService.getHierarchy(acc.id),
        ApiService.getRules(acc.id),
        ApiService.getAutomationActions({ adAccountId: acc.id }),
        ApiService.getDashboardSummary(acc.id),
        ApiService.getPancakeStats(acc.id).catch(() => null),
      ]);
      setCampaigns(hier);
      setRules(rls);
      setActions(acts);
      setSummary(sum);
      setPancakeStats(pStats);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    setCurrentUser(null);
    loadData();
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

      {/* Backend Connection Loading, Success & Error Banner */}
      <BackendConnectionBanner
        connectionState={connectionState}
        elapsedSeconds={elapsedSeconds}
        onRetry={handleWakeUpAndConnect}
        onSuccessDismiss={() => setConnectionState('idle')}
      />

      {/* Main Layout Shell */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          rulesCount={rules.length}
          isMockMode={isMockMode}
          currentUser={currentUser}
          onOpenLogin={() => setIsLoginOpen(true)}
          onLogout={handleLogout}
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
                rules={rules}
                pancakeStats={pancakeStats}
                selectedAccount={selectedAccount}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'pancake' && (
              <PancakeView
                selectedAccount={selectedAccount}
                currency={currency}
              />
            )}

            {activeTab === 'rules' && (
              <RuleBuilderView
                rules={rules}
                accounts={accounts}
                selectedAccount={selectedAccount}
                campaigns={campaigns}
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

            {activeTab === 'telegram' && (
              <TelegramView />
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
