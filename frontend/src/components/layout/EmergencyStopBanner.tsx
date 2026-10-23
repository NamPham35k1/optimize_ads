import React from 'react';
import { AlertOctagon, Power } from 'lucide-react';

interface Props {
  isActive: boolean;
  onDisable: () => void;
  loading: boolean;
}

export const EmergencyStopBanner: React.FC<Props> = ({ isActive, onDisable, loading }) => {
  if (!isActive) return null;

  return (
    <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-2.5 shadow-lg flex items-center justify-between animate-pulse">
      <div className="flex items-center space-x-3">
        <AlertOctagon className="w-6 h-6 text-white shrink-0" />
        <div>
          <span className="font-bold tracking-wide uppercase text-sm">
            CẢNH BÁO: CHẾ ĐỘ DỪNG KHẨN CẤP ĐANG BẬT (EMERGENCY STOP)
          </span>
          <p className="text-xs text-red-100">
            Mọi hành vi tự động tạm dừng chiến dịch/nhóm quảng cáo đều bị đóng băng 100% để bảo vệ ngân sách.
          </p>
        </div>
      </div>
      <button
        onClick={onDisable}
        disabled={loading}
        className="px-3.5 py-1.5 bg-white text-red-700 hover:bg-red-50 text-xs font-semibold rounded-lg shadow-sm flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer"
      >
        <Power className="w-3.5 h-3.5" />
        <span>{loading ? 'Đang tắt...' : 'Mở lại hệ thống'}</span>
      </button>
    </div>
  );
};
