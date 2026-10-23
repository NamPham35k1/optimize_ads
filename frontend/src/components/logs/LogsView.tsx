import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ShieldAlert,
  Clock,
  Layers,
} from 'lucide-react';
import { AutomationAction } from '../../types';

interface Props {
  actions: AutomationAction[];
  currency: string;
  onRefresh: () => void;
}

export const LogsView: React.FC<Props> = ({ actions, currency = 'VND' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredActions = actions.filter((act) => {
    const matchesSearch =
      act.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.entityId.includes(searchTerm) ||
      (act.rule?.name && act.rule.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return act.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>THÀNH CÔNG (LIVE)</span>
          </span>
        );
      case 'DRY_RUN':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Shield className="w-3 h-3 text-amber-400" />
            <span>DRY RUN (MÔ PHỎNG)</span>
          </span>
        );
      case 'BLOCKED_BY_SAFETY':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>CHẶN BỞI SAFETY</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3 h-3" />
            <span>THẤT BẠI</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-400" />
          <span>Nhật Ký Tự Động Hóa (Automation Audit Logs)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Theo dõi mọi quyết định kiểm tra, hành vi mô phỏng Dry Run và lệnh API thực tế gửi lên Meta Marketing API.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên đối tượng, ID hoặc tên quy tắc..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {['ALL', 'SUCCESS', 'DRY_RUN', 'BLOCKED_BY_SAFETY', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'ALL'
                ? 'Tất cả'
                : st === 'SUCCESS'
                ? 'Live'
                : st === 'DRY_RUN'
                ? 'Dry Run'
                : st === 'BLOCKED_BY_SAFETY'
                ? 'Chặn an toàn'
                : 'Thất bại'}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Thời Gian</th>
                <th className="py-3.5 px-4">Quy Tắc Kích Hoạt</th>
                <th className="py-3.5 px-4">Đối Tượng Bị Tác Động</th>
                <th className="py-3.5 px-3">Hành Động</th>
                <th className="py-3.5 px-3">Trạng Thái</th>
                <th className="py-3.5 px-4">Kết Quả / Phản Hồi API</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Chưa có lịch sử tự động nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredActions.map((act) => {
                  const dateStr = new Date(act.executedAt).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  });

                  return (
                    <tr key={act.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{dateStr}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">
                          {act.rule?.name || 'Quy tắc thủ công'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {act.adAccount?.name || 'Tài khoản Meta'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-200">{act.entityName}</span>
                          <span className="text-[9px] px-1.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {act.entityType}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          ID: {act.entityId}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[10px]">
                          {act.actionType}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{getStatusBadge(act.status)}</td>
                      <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-400">
                        {act.errorMessage ? (
                          <span className="text-red-400">{act.errorMessage}</span>
                        ) : act.status === 'DRY_RUN' ? (
                          <span className="text-amber-300">
                            Đã ghi nhận dự kiến tắt (Dry Run an toàn, không gọi API)
                          </span>
                        ) : act.isVerified ? (
                          <span className="text-emerald-400">
                            Đã xác minh trạng thái Meta: {act.postActionStatus || 'PAUSED'}
                          </span>
                        ) : (
                          <span>{act.apiResponse || 'Hoàn tất'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
