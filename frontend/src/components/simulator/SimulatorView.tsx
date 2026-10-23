import React, { useState } from 'react';
import {
  PlayCircle,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Pause,
} from 'lucide-react';
import { CareRule, AdAccount } from '../../types';
import { ApiService } from '../../services/api';

interface Props {
  rules: CareRule[];
  selectedAccount: AdAccount | null;
  currency: string;
}

export const SimulatorView: React.FC<Props> = ({ rules, selectedAccount, currency = 'VND' }) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string>(rules[0]?.id || '');
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Manual simulation parameters
  const [scope, setScope] = useState<'CAMPAIGN' | 'ADSET' | 'AD'>('ADSET');
  const [metricType, setMetricType] = useState('COST_PER_MESSAGING');
  const [operator, setOperator] = useState('GREATER_THAN');
  const [thresholdValue, setThresholdValue] = useState(100000);
  const [minResults, setMinResults] = useState(3);
  const [minSpend, setMinSpend] = useState(200000);
  const [reportingWindow, setReportingWindow] = useState('TODAY');

  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  const handleRunSimulation = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const payload = selectedRule
        ? {
            adAccountId: selectedAccount.id,
            scope: selectedRule.scope,
            targetMode: selectedRule.targetMode,
            targetEntityIds: [],
            metricType: selectedRule.metricType,
            operator: selectedRule.operator,
            thresholdValue: selectedRule.thresholdValue,
            reportingWindow: selectedRule.reportingWindow,
            minResults: selectedRule.minResults,
            minSpend: selectedRule.minSpend,
            consecutiveViolationsRequired: selectedRule.consecutiveViolationsRequired,
            action: selectedRule.action,
          }
        : {
            adAccountId: selectedAccount.id,
            scope,
            targetMode: 'ALL_ACTIVE',
            targetEntityIds: [],
            metricType,
            operator,
            thresholdValue,
            reportingWindow,
            minResults,
            minSpend,
            consecutiveViolationsRequired: 2,
            action: 'PAUSE',
          };

      const result = await ApiService.simulateRule(payload);
      setSimulationResult(result);
    } catch (err: any) {
      alert(`Lỗi khi mô phỏng: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val?: number) => {
    if (!val && val !== 0) return '—';
    return `${Math.round(val).toLocaleString('vi-VN')} đ`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <PlayCircle className="w-6 h-6 text-indigo-400" />
          <span>Mô Phỏng Đánh Giá Quy Tắc (Rule Simulator)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Kiểm thử điều kiện trên dữ liệu thực tế trước khi kích hoạt. Xem chính xác đối tượng nào sẽ bị ảnh hưởng mà không thay đổi bất kỳ trạng thái nào trên Meta.
        </p>
      </div>

      {/* Simulator Control Panel */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Chọn Quy Tắc Muốn Mô Phỏng:
            </label>
            <select
              value={selectedRuleId}
              onChange={(e) => {
                setSelectedRuleId(e.target.value);
                setSimulationResult(null);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.scope}) — {r.thresholdValue.toLocaleString('vi-VN')} {r.currency}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunSimulation}
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer shrink-0"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4" />
            )}
            <span>{loading ? 'Đang mô phỏng...' : 'Chạy Thử Nghiệm Mô Phỏng (Test Rule)'}</span>
          </button>
        </div>

        {selectedRule && (
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-300 flex items-center space-x-2">
            <span className="text-indigo-400 font-bold">Cấu hình:</span>
            <span>
              {selectedRule.metricType} {selectedRule.operator} {selectedRule.thresholdValue.toLocaleString('vi-VN')} {selectedRule.currency} | Tối thiểu {selectedRule.minResults} tin nhắn | {selectedRule.reportingWindow}
            </span>
          </div>
        )}
      </div>

      {/* Simulation Results Section */}
      {simulationResult && (
        <div className="space-y-4 animate-fadeIn">
          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block font-medium">Tổng Đối Tượng Đánh Giá</span>
              <span className="text-2xl font-black text-white mt-1 block">
                {simulationResult.totalEvaluated}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block font-medium">Số Đối Tượng Vi Phạm</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">
                {simulationResult.totalViolations}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block font-medium">Hành Động Dự Kiến Tạm Dừng</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block">
                {simulationResult.totalActionsTriggered}
              </span>
            </div>
          </div>

          {/* Breakdown List */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Chi Tiết Kết Quả Mô Phỏng Từng Đối Tượng</h3>

            <div className="space-y-3">
              {simulationResult.entities.map((item: any, idx: number) => {
                const isViolated = item.matchResult.conditionMet;
                const isSufficient = item.matchResult.isSufficientData;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isViolated
                        ? 'bg-rose-950/10 border-rose-500/40'
                        : !isSufficient
                        ? 'bg-slate-950/40 border-slate-800'
                        : 'bg-emerald-950/10 border-emerald-500/30'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm">{item.entityName}</span>
                          <span className="text-[10px] px-1.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {item.entityId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1.5">{item.matchResult.reason}</p>
                      </div>

                      {/* Right badge */}
                      <div className="flex items-center space-x-3 self-end md:self-center">
                        {isViolated ? (
                          <div className="flex items-center space-x-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold">
                            <Pause className="w-3.5 h-3.5" />
                            <span>Dự kiến TẠM DỪNG</span>
                          </div>
                        ) : !isSufficient ? (
                          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-xs font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Chưa đủ dữ liệu</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Trong ngưỡng an toàn</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400">
                      <div>
                        Chi tiêu: <strong className="text-white">{formatMoney(item.metrics.spend)}</strong>
                      </div>
                      <div>
                        Số tin nhắn: <strong className="text-white">{item.metrics.messagingConversations} tin</strong>
                      </div>
                      <div>
                        CPA: <strong className="text-white">{formatMoney(item.metrics.costPerMessaging)}</strong>
                      </div>
                      <div>
                        CPM: <strong className="text-white">{formatMoney(item.metrics.cpm)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
