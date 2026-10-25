import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Play,
  Pause,
  AlertTriangle,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { CareRule, AdAccount, CampaignSnapshot } from '../../types';
import { ApiService } from '../../services/api';

interface Props {
  rules: CareRule[];
  accounts: AdAccount[];
  selectedAccount: AdAccount | null;
  campaigns?: CampaignSnapshot[];
  onRefresh: () => void;
  onOpenSimulatorWithRule?: (rule: Partial<CareRule>) => void;
}

export const RuleBuilderView: React.FC<Props> = ({
  rules,
  accounts,
  selectedAccount,
  campaigns = [],
  onRefresh,
  onOpenSimulatorWithRule,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('Tự động dừng quảng cáo tin nhắn chi phí cao');
  const [adAccountId, setAdAccountId] = useState(selectedAccount?.id || '');
  const [scope, setScope] = useState<'CAMPAIGN' | 'ADSET' | 'AD'>('ADSET');
  const [targetMode, setTargetMode] = useState<'ALL_ACTIVE' | 'SELECTED'>('ALL_ACTIVE');
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [metricType, setMetricType] = useState('COST_PER_MESSAGING');
  const [operator, setOperator] = useState('GREATER_THAN');
  const [thresholdValue, setThresholdValue] = useState(100000);
  const [currency, setCurrency] = useState('VND');
  const [reportingWindow, setReportingWindow] = useState('TODAY');
  const [minResults, setMinResults] = useState(3);
  const [minSpend, setMinSpend] = useState(0);
  const [consecutiveViolationsRequired, setConsecutiveViolationsRequired] = useState(2);
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(15);
  const [action, setAction] = useState<'PAUSE' | 'NOTIFY_ONLY'>('PAUSE');
  const [isDryRun, setIsDryRun] = useState(true); // Always default to true!
  const [isEnabled, setIsEnabled] = useState(true);

  // Live Mode Confirmation Dialog
  const [confirmLiveRule, setConfirmLiveRule] = useState<CareRule | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEditingRuleId(null);
    setName('Tự động dừng quảng cáo tin nhắn chi phí cao');
    setScope('ADSET');
    setTargetMode('ALL_ACTIVE');
    setSelectedEntityIds([]);
    setCampaignSearch('');
    setMetricType('COST_PER_MESSAGING');
    setOperator('GREATER_THAN');
    setThresholdValue(100000);
    setCurrency('VND');
    setReportingWindow('TODAY');
    setMinResults(3);
    setMinSpend(0);
    setConsecutiveViolationsRequired(2);
    setCheckIntervalMinutes(15);
    setAction('PAUSE');
    setIsDryRun(true);
    setIsEnabled(true);
  };

  const handleOpenEdit = (rule: CareRule) => {
    setEditingRuleId(rule.id);
    setName(rule.name);
    setAdAccountId(rule.adAccountId);
    setScope(rule.scope);
    setTargetMode(rule.targetMode);
    try {
      const parsed = JSON.parse(rule.targetEntityIds || '[]');
      setSelectedEntityIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSelectedEntityIds([]);
    }
    setCampaignSearch('');
    setMetricType(rule.metricType);
    setOperator(rule.operator);
    setThresholdValue(rule.thresholdValue);
    setCurrency(rule.currency);
    setReportingWindow(rule.reportingWindow);
    setMinResults(rule.minResults);
    setMinSpend(rule.minSpend);
    setConsecutiveViolationsRequired(rule.consecutiveViolationsRequired);
    setCheckIntervalMinutes(rule.checkIntervalMinutes);
    setAction(rule.action);
    setIsDryRun(rule.isDryRun);
    setIsEnabled(rule.isEnabled);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Partial<CareRule> = {
        name,
        adAccountId: adAccountId || selectedAccount?.id,
        scope,
        targetMode,
        targetEntityIds: JSON.stringify(selectedEntityIds),
        metricType,
        operator: operator as any,
        thresholdValue: Number(thresholdValue),
        currency,
        reportingWindow,
        minResults: Number(minResults),
        minSpend: Number(minSpend),
        consecutiveViolationsRequired: Number(consecutiveViolationsRequired),
        checkIntervalMinutes: Number(checkIntervalMinutes),
        action,
        isDryRun,
        isEnabled,
      };

      if (editingRuleId) {
        await ApiService.updateRule(editingRuleId, payload);
      } else {
        await ApiService.createRule(payload);
      }

      setShowModal(false);
      resetForm();
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi khi lưu quy tắc: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (id: string) => {
    try {
      await ApiService.toggleRuleEnabled(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleLiveMode = async (rule: CareRule) => {
    if (rule.isDryRun) {
      // Prompt user confirmation to switch to LIVE
      setConfirmLiveRule(rule);
    } else {
      // Switching back to DRY RUN is always safe
      await ApiService.toggleLiveMode(rule.id, true);
      onRefresh();
    }
  };

  const confirmSwitchToLive = async () => {
    if (!confirmLiveRule) return;
    try {
      await ApiService.toggleLiveMode(confirmLiveRule.id, false, true);
      setConfirmLiveRule(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa quy tắc này?')) return;
    try {
      await ApiService.deleteRule(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEvaluateNow = async (id: string) => {
    try {
      const res = await ApiService.evaluateRuleNow(id);
      alert(`Đã đánh giá xong: ${res.data.totalEvaluated} đối tượng, ${res.data.totalViolations} vi phạm.`);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Trung Tâm Thiết Lập Quy Tắc Tự Động (Rule Builder)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cấu hình điều kiện đánh giá chi phí, số lượng tin nhắn và số lần vi phạm liên tiếp trước khi thực hiện hành động.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center space-x-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Quy Tắc Mới</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Sliders className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-300">Chưa có quy tắc nào</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy tạo quy tắc đầu tiên để tự động theo dõi và tạm dừng các nhóm quảng cáo tin nhắn chi phí cao.
            </p>
          </div>
        ) : (
          rules.map((rule) => {
            const isViolating = rule.currentConsecutiveViolations > 0;

            return (
              <div
                key={rule.id}
                className={`bg-slate-900/60 border rounded-2xl p-5 transition-all ${
                  !rule.isEnabled
                    ? 'border-slate-800/40 opacity-60'
                    : isViolating
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Rule details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                      <h3 className="text-base font-bold text-white">{rule.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {rule.scope}
                      </span>
                      {rule.targetMode === 'SELECTED' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          🎯 Áp dụng riêng ({(() => {
                            try {
                              const ids = JSON.parse(rule.targetEntityIds || '[]');
                              return `${ids.length} camp`;
                            } catch {
                              return 'Chỉ định riêng';
                            }
                          })()})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                          🌐 Chung cho mọi camp đang chạy
                        </span>
                      )}
                      {rule.isDryRun ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-400" />
                          DRY RUN (Mô phỏng an toàn)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          LIVE MODE (Thực thi API)
                        </span>
                      )}
                    </div>

                    {/* Rule logic readable description */}
                    <div className="text-xs text-slate-300 font-mono bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 flex items-center space-x-2">
                      <span className="text-blue-400 font-bold">IF:</span>
                      <span>
                        {rule.metricType === 'COST_PER_MESSAGING'
                          ? 'Chi phí / Tin Nhắn'
                          : rule.metricType}{' '}
                        {rule.operator === 'GREATER_THAN'
                          ? '>'
                          : rule.operator === 'GREATER_THAN_OR_EQUAL'
                          ? '>='
                          : '<'}{' '}
                        <strong>{rule.thresholdValue.toLocaleString('vi-VN')} {rule.currency}</strong>
                        {rule.minResults > 0 && ` (Tối thiểu ≥ ${rule.minResults} tin nhắn)`}
                        {rule.metricType === 'SPEND_WITHOUT_MESSAGES' &&
                          ` (Chi tiêu ≥ ${rule.minSpend.toLocaleString('vi-VN')} đ khi 0 tin nhắn)`}
                        {' • '}
                        {rule.consecutiveViolationsRequired} lần kiểm tra liên tiếp
                      </span>
                      <span className="text-rose-400 font-bold ml-2">THEN:</span>
                      <span className="text-rose-300 font-bold">
                        {rule.action === 'PAUSE' ? 'Tạm Dừng Đối Tượng' : 'Chỉ Gửi Thông Báo'}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                      <span>Chu kỳ: Mỗi {rule.checkIntervalMinutes} phút</span>
                      <span>Khoảng thời gian: {rule.reportingWindow}</span>
                      <span>
                        Lần vi phạm liên tiếp hiện tại:{' '}
                        <strong
                          className={
                            rule.currentConsecutiveViolations > 0 ? 'text-amber-400' : 'text-slate-300'
                          }
                        >
                          {rule.currentConsecutiveViolations} / {rule.consecutiveViolationsRequired}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center space-x-2 self-end lg:self-center">
                    {/* Run evaluation now */}
                    <button
                      onClick={() => handleEvaluateNow(rule.id)}
                      title="Kiểm tra ngay đối tượng"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-blue-400" />
                      <span>Chạy ngay</span>
                    </button>

                    {/* Simulator preview */}
                    {onOpenSimulatorWithRule && (
                      <button
                        onClick={() => onOpenSimulatorWithRule(rule)}
                        title="Mô phỏng quy tắc này"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg border border-slate-700 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    {/* Dry run vs Live toggle */}
                    <button
                      onClick={() => handleToggleLiveMode(rule)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        rule.isDryRun
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500'
                          : 'bg-rose-600 text-white border-rose-500 shadow-sm'
                      }`}
                    >
                      {rule.isDryRun ? 'Bật Live Mode' : 'Chuyển Dry Run'}
                    </button>

                    {/* Enable / Disable */}
                    <button
                      onClick={() => handleToggleEnabled(rule.id)}
                      className={`p-1.5 rounded-lg border cursor-pointer ${
                        rule.isEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                      title={rule.isEnabled ? 'Quy tắc đang bật' : 'Quy tắc đang tắt'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(rule)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 font-bold text-white text-base">
                <Sliders className="w-5 h-5 text-blue-400" />
                <span>{editingRuleId ? 'Chỉnh Sửa Quy Tắc' : 'Tạo Quy Tắc Tự Động Mới'}</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Rule Name */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Tên Quy Tắc *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Tự động tắt adset tin nhắn vượt 100k"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Scope & Target Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Phạm Vi Áp Dụng</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="CAMPAIGN">Chiến Dịch (Campaign)</option>
                    <option value="ADSET">Nhóm Quảng Cáo (Ad Set)</option>
                    <option value="AD">Quảng Cáo (Ad)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Đối Tượng Áp Dụng</label>
                  <select
                    value={targetMode}
                    onChange={(e) => setTargetMode(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="ALL_ACTIVE">Tất cả đối tượng đang chạy (Active)</option>
                    <option value="SELECTED">Chỉ định chiến dịch cụ thể</option>
                  </select>
                </div>
              </div>

              {/* Campaign Picker when targetMode is SELECTED */}
              {targetMode === 'SELECTED' && (
                <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-indigo-300 text-xs block">
                        Chọn các Chiến Dịch (Campaign) áp dụng riêng quy tắc này:
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Đã chọn <strong>{selectedEntityIds.length}</strong> / {(campaigns || []).length} chiến dịch
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedEntityIds((campaigns || []).map((c) => c.fbCampaignId))}
                        className="text-indigo-400 hover:underline"
                      >
                        Chọn tất cả
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedEntityIds([])}
                        className="text-slate-400 hover:underline"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* Search filter */}
                  <input
                    type="text"
                    value={campaignSearch}
                    onChange={(e) => setCampaignSearch(e.target.value)}
                    placeholder="Tìm tên hoặc ID chiến dịch..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />

                  {/* Campaign checkbox list */}
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {(campaigns || [])
                      .filter(
                        (c) =>
                          c.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                          c.fbCampaignId.includes(campaignSearch)
                      )
                      .map((c) => {
                        const isChecked = selectedEntityIds.includes(c.fbCampaignId);
                        return (
                          <label
                            key={c.id || c.fbCampaignId}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedEntityIds(selectedEntityIds.filter((id) => id !== c.fbCampaignId));
                                  } else {
                                    setSelectedEntityIds([...selectedEntityIds, c.fbCampaignId]);
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="truncate">
                                <span className="font-semibold block truncate">{c.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">ID: {c.fbCampaignId}</span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-2 ${
                                c.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {c.status === 'ACTIVE' ? 'Đang chạy' : 'Tạm dừng'}
                            </span>
                          </label>
                        );
                      })}
                    {(campaigns || []).length === 0 && (
                      <p className="text-center py-3 text-slate-500 text-xs">
                        Chưa có dữ liệu chiến dịch để chọn. Vui lòng kết nối tài khoản hoặc tạo demo.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Metric & Operator & Threshold */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Chỉ Số Giám Sát</label>
                  <select
                    value={metricType}
                    onChange={(e) => setMetricType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="COST_PER_MESSAGING">Chi phí / Tin Nhắn (CPA)</option>
                    <option value="SPEND_WITHOUT_MESSAGES">Chi tiêu khi 0 tin nhắn</option>
                    <option value="ADS_COST_REVENUE_PERCENT">Chi phí Ads / Doanh thu Pancake (%)</option>
                    <option value="CPM">CPM (Chi phí 1000 lượt hiển thị)</option>
                    <option value="CPC">CPC (Chi phí / lượt click)</option>
                    <option value="CTR">CTR (Tỷ lệ click)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Toán Tử</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="GREATER_THAN">Lớn hơn (&gt;)</option>
                    <option value="GREATER_THAN_OR_EQUAL">Lớn hơn hoặc bằng (&gt;=)</option>
                    <option value="LESS_THAN">Nhỏ hơn (&lt;)</option>
                    <option value="LESS_THAN_OR_EQUAL">Nhỏ hơn hoặc bằng (&lt;=)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Ngưỡng ({currency})</label>
                  <input
                    type="number"
                    required
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Minimum results & Minimum spend safeguards */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="font-semibold text-slate-300 block mb-0.5">
                    Số Tin Nhắn Tối Thiểu Trước Khi Đánh Giá
                  </label>
                  <p className="text-[10px] text-slate-500 mb-1">
                    Tránh tắt oan chiến dịch mới chạy có 1 click chi phí cao
                  </p>
                  <input
                    type="number"
                    min={0}
                    value={minResults}
                    onChange={(e) => setMinResults(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-0.5">
                    Ngưỡng Chi Tiêu Tối Thiểu Cho 0 Tin Nhắn
                  </label>
                  <p className="text-[10px] text-slate-500 mb-1">
                    Áp dụng cho quy tắc tắt khi tiêu nhiều mà 0 có tin nhắn
                  </p>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={minSpend}
                    onChange={(e) => setMinSpend(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Consecutive violations & Check Frequency */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Số Lần Vi Phạm Liên Tiếp
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={consecutiveViolationsRequired}
                    onChange={(e) => setConsecutiveViolationsRequired(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Khoảng Thời Gian Báo Cáo
                  </label>
                  <select
                    value={reportingWindow}
                    onChange={(e) => setReportingWindow(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="TODAY">Hôm nay (Today)</option>
                    <option value="YESTERDAY">Hôm qua (Yesterday)</option>
                    <option value="LAST_3D">3 ngày gần nhất</option>
                    <option value="LAST_7D">7 ngày gần nhất</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Chu Kỳ Kiểm Tra</label>
                  <select
                    value={checkIntervalMinutes}
                    onChange={(e) => setCheckIntervalMinutes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value={2}>Mỗi 2 phút</option>
                    <option value={3}>Mỗi 3 phút</option>
                    <option value={5}>Mỗi 5 phút</option>
                    <option value={10}>Mỗi 10 phút</option>
                    <option value={15}>Mỗi 15 phút (Khuyên dùng)</option>
                    <option value={30}>Mỗi 30 phút</option>
                    <option value={60}>Mỗi 1 giờ</option>
                    <option value={360}>Mỗi 6 giờ</option>
                  </select>
                </div>
              </div>

              {/* Action & Dry Run */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Hành Động Khi Vi Phạm</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="PAUSE">Tạm Dừng Đối Tượng (PAUSE)</option>
                    <option value="NOTIFY_ONLY">Chỉ Gửi Cảnh Báo (NOTIFY_ONLY)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Chế Độ Hoạt Động</label>
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="checkbox"
                      id="isDryRun"
                      checked={isDryRun}
                      onChange={(e) => setIsDryRun(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded bg-slate-950 border-slate-700"
                    />
                    <label htmlFor="isDryRun" className="text-slate-300 font-semibold cursor-pointer">
                      Dry Run (Mô phỏng an toàn, không gọi API thật)
                    </label>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20"
                >
                  {loading ? 'Đang lưu...' : 'Lưu Quy Tắc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation modal before switching to Live Mode */}
      {confirmLiveRule && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-500">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <h3 className="text-lg font-bold text-white">Xác Nhận Kích Hoạt Live Mode</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn đang chuyển quy tắc <strong>"{confirmLiveRule.name}"</strong> sang{' '}
              <strong className="text-rose-400">CHẾ ĐỘ THẬT (LIVE MODE)</strong>.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <p>• Khi phát hiện vi phạm, hệ thống sẽ gửi lệnh <strong>PAUSED</strong> trực tiếp lên Meta Marketing API.</p>
              <p>• Trạng thái quảng cáo trên Ads Manager của bạn sẽ bị tạm dừng.</p>
              <p>• Bạn có thể chuyển lại Dry Run bất kỳ lúc nào.</p>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmLiveRule(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmSwitchToLive}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-rose-600/30"
              >
                Tôi Xác Nhận Kích Hoạt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
