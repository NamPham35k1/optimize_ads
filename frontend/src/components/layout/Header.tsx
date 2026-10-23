import React, { useState } from 'react';
import {
  Bell,
  RefreshCw,
  AlertTriangle,
  Play,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';
import { AdAccount } from '../../types';

interface Props {
  accounts: AdAccount[];
  selectedAccount: AdAccount | null;
  onSelectAccount: (acc: AdAccount) => void;
  emergencyStop: boolean;
  onToggleEmergencyStop: (enable: boolean) => void;
  onTriggerScheduler: () => void;
  onRefreshData: () => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  loading: boolean;
}

export const Header: React.FC<Props> = ({
  accounts,
  selectedAccount,
  onSelectAccount,
  emergencyStop,
  onToggleEmergencyStop,
  onTriggerScheduler,
  onRefreshData,
  unreadNotificationsCount,
  onOpenNotifications,
  loading,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  return (
    <>
      <header className="h-16 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between shrink-0 z-20">
        {/* Left: Account Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Tài Khoản Ads:
          </label>
          <div className="relative">
            <select
              value={selectedAccount?.id || ''}
              onChange={(e) => {
                const found = (accounts || []).find((a) => a.id === e.target.value);
                if (found) onSelectAccount(found);
              }}
              className="appearance-none bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-100 text-sm font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {(accounts || []).length === 0 && (
                <option value="">Chưa kết nối tài khoản</option>
              )}
              {(accounts || []).map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency}) {acc.isMock ? '— [MOCK]' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-3">
          {/* Run scheduler check now */}
          <button
            onClick={onTriggerScheduler}
            title="Kích hoạt chu kỳ kiểm tra các quy tắc ngay lập tức"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
            <span>Chạy kiểm tra</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={onRefreshData}
            disabled={loading}
            title="Làm mới dữ liệu từ Meta / Database"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Notifications */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-bounce">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          <div className="h-6 w-[1px] bg-slate-800 mx-1" />

          {/* Emergency Stop Switch */}
          {emergencyStop ? (
            <button
              onClick={() => onToggleEmergencyStop(false)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md shadow-red-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>DỪNG KHẨN CẤP (BẬT)</span>
            </button>
          ) : (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/40 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>Emergency Stop</span>
            </button>
          )}
        </div>
      </header>

      {/* Emergency Stop Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-500">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h3 className="text-lg font-bold text-white">Kích hoạt Emergency Stop?</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Khi bật <strong className="text-red-400">Emergency Stop</strong>, toàn bộ hành động
              tự động tạm dừng chiến dịch/nhóm quảng cáo sẽ bị <strong>ngừng ngay lập tức</strong>.
              Hệ thống sẽ chỉ quan sát và ghi log, tuyệt đối không gửi lệnh tắt lên Meta API.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  onToggleEmergencyStop(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-red-600/30"
              >
                Xác nhận kích hoạt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
