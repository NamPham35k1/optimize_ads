import React, { useState } from 'react';
import {
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowUpDown,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
} from 'lucide-react';
import { CampaignSnapshot, AdSetSnapshot, AdSnapshot, CareRule, PancakeFinancialStats } from '../../types';

interface Props {
  campaigns: CampaignSnapshot[];
  currency: string;
  rules?: CareRule[];
  pancakeStats?: PancakeFinancialStats | null;
  onRefresh: () => void;
}

export const CampaignsView: React.FC<Props> = ({ campaigns, currency = 'VND', rules = [], pancakeStats }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [expandedAdSets, setExpandedAdSets] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<'spend' | 'costPerMessaging' | 'messagingConversations'>('spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAdSet = (id: string) => {
    setExpandedAdSets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatMoney = (val?: number) => {
    if (!val && val !== 0) return '—';
    return `${Math.round(val).toLocaleString('vi-VN')} đ`;
  };

  // Filter & Search
  const filteredCampaigns = campaigns.filter((camp) => {
    const matchesSearch =
      camp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camp.fbCampaignId.includes(searchTerm);

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return camp.status === 'ACTIVE';
    if (statusFilter === 'PAUSED') return camp.status === 'PAUSED' && !camp.isPausedBySystem;
    if (statusFilter === 'AUTO_PAUSED') return camp.isPausedBySystem;
    return true;
  });

  // Sort
  filteredCampaigns.sort((a, b) => {
    const aVal = a.metrics ? (a.metrics as any)[sortField] || 0 : 0;
    const bVal = b.metrics ? (b.metrics as any)[sortField] || 0 : 0;
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const getStatusBadge = (status: string, isPausedBySystem: boolean) => {
    if (isPausedBySystem) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Pause className="w-3 h-3" />
          <span>TỰ ĐỘNG TẮT</span>
        </span>
      );
    }
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Play className="w-3 h-3" />
          <span>ĐANG CHẠY</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
        <Pause className="w-3 h-3" />
        <span>TẠM DỪNG</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên chiến dịch hoặc ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3">
          {/* Status filter */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {['ALL', 'ACTIVE', 'PAUSED', 'AUTO_PAUSED'].map((st) => (
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
                  : st === 'ACTIVE'
                  ? 'Đang chạy'
                  : st === 'PAUSED'
                  ? 'Tạm dừng'
                  : 'Hệ thống tắt'}
              </button>
            ))}
          </div>

          {/* Sort selection */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-xs flex items-center gap-1.5 cursor-pointer"
            title="Đổi thứ tự sắp xếp"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'desc' ? 'Cao nhất' : 'Thấp nhất'}</span>
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-8"></th>
                <th className="py-3.5 px-4">Đối Tượng Quảng Cáo</th>
                <th className="py-3.5 px-3">Trạng Thái</th>
                <th className="py-3.5 px-3 text-right">Chi Tiêu Hôm Nay</th>
                <th className="py-3.5 px-3 text-right">Số Tin Nhắn</th>
                <th className="py-3.5 px-3 text-right">Chi Phí / Tin (CPA)</th>
                <th className="py-3.5 px-3 text-right">CPM</th>
                <th className="py-3.5 px-3 text-right">CPC</th>
                <th className="py-3.5 px-3 text-right">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Không tìm thấy chiến dịch nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((camp) => {
                  const isExp = expandedCampaigns[camp.fbCampaignId];
                  const m = camp.metrics || {
                    spend: 0,
                    messagingConversations: 0,
                    costPerMessaging: 0,
                    cpm: 0,
                    cpc: 0,
                    ctr: 0,
                  };

                  const matchingRules = rules.filter((r) => {
                    if (!r.isEnabled) return false;
                    if (r.targetMode === 'ALL_ACTIVE') return true;
                    try {
                      const ids = JSON.parse(r.targetEntityIds || '[]');
                      return ids.includes(camp.fbCampaignId);
                    } catch {
                      return false;
                    }
                  });

                  const campPancake = pancakeStats?.campaigns?.find(
                    (c) => c.campaignId === camp.fbCampaignId
                  );

                  return (
                    <React.Fragment key={camp.fbCampaignId}>
                      {/* Campaign Row */}
                      <tr className="hover:bg-slate-800/30 transition-colors bg-slate-900/40">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleCampaign(camp.fbCampaignId)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                          >
                            {isExp ? (
                              <ChevronDown className="w-4 h-4 text-blue-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm flex items-center space-x-2">
                            <span>{camp.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-normal">
                              Campaign
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: {camp.fbCampaignId} • Mục tiêu: {camp.objective}
                          </div>

                          {/* Matching Rules Tags */}
                          {matchingRules.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-sans">Quy tắc:</span>
                              {matchingRules.map((r) => (
                                <span
                                  key={r.id}
                                  className={`text-[10px] px-1.5 py-0.5 rounded border font-sans flex items-center gap-1 ${
                                    r.targetMode === 'SELECTED'
                                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                  }`}
                                  title={r.targetMode === 'SELECTED' ? 'Quy tắc áp dụng riêng cho camp này' : 'Quy tắc chung cho tất cả camp'}
                                >
                                  <span>{r.targetMode === 'SELECTED' ? '🎯' : '🌐'} {r.name}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Pancake POS Profit/Loss Badge */}
                          {campPancake && campPancake.revenue > 0 && (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap font-sans">
                              <span className="text-[10px] text-slate-400">Pancake:</span>
                              <span className="text-[10px] text-white font-medium">{formatMoney(campPancake.revenue)} ({campPancake.orders} đơn)</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                  campPancake.status === 'SAFE'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : campPancake.status === 'WARNING'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {campPancake.status === 'SAFE' ? '🟢' : campPancake.status === 'WARNING' ? '🟡' : '🔴'} Chi phí: {campPancake.costRevenuePercent}%
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {getStatusBadge(camp.status, camp.isPausedBySystem)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-white">
                          {formatMoney(m.spend)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                            {m.messagingConversations} tin
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          <span
                            className={
                              m.costPerMessaging > 100000
                                ? 'text-rose-400 font-bold'
                                : 'text-emerald-400'
                            }
                          >
                            {m.costPerMessaging > 0 ? formatMoney(m.costPerMessaging) : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400">{formatMoney(m.cpm)}</td>
                        <td className="py-3 px-3 text-right text-slate-400">{formatMoney(m.cpc)}</td>
                        <td className="py-3 px-3 text-right text-slate-400">{m.ctr}%</td>
                      </tr>

                      {/* Nested AdSets */}
                      {isExp &&
                        camp.adSets.map((adSet) => {
                          const isSetExp = expandedAdSets[adSet.fbAdSetId];
                          const setM = adSet.metrics || {
                            spend: 0,
                            messagingConversations: 0,
                            costPerMessaging: 0,
                            cpm: 0,
                            cpc: 0,
                            ctr: 0,
                          };

                          return (
                            <React.Fragment key={adSet.fbAdSetId}>
                              <tr className="hover:bg-slate-800/40 bg-slate-950/40 border-l-2 border-l-blue-500">
                                <td className="py-2.5 px-4 pl-8">
                                  <button
                                    onClick={() => toggleAdSet(adSet.fbAdSetId)}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                                  >
                                    {isSetExp ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </td>
                                <td className="py-2.5 px-4">
                                  <div className="font-semibold text-slate-200 flex items-center space-x-2">
                                    <span>{adSet.name}</span>
                                    <span className="text-[9px] px-1.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-normal">
                                      Ad Set
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    ID: {adSet.fbAdSetId}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  {getStatusBadge(adSet.status, adSet.isPausedBySystem)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-200">
                                  {formatMoney(setM.spend)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-300">
                                  {setM.messagingConversations} tin
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold">
                                  <span
                                    className={
                                      setM.costPerMessaging > 100000
                                        ? 'text-rose-400'
                                        : 'text-emerald-400'
                                    }
                                  >
                                    {setM.costPerMessaging > 0
                                      ? formatMoney(setM.costPerMessaging)
                                      : '—'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-400">
                                  {formatMoney(setM.cpm)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-400">
                                  {formatMoney(setM.cpc)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-400">
                                  {setM.ctr}%
                                </td>
                              </tr>

                              {/* Nested Ads */}
                              {isSetExp &&
                                adSet.ads.map((ad) => {
                                  const adM = ad.metrics || {
                                    spend: 0,
                                    messagingConversations: 0,
                                    costPerMessaging: 0,
                                    cpm: 0,
                                    cpc: 0,
                                    ctr: 0,
                                  };

                                  return (
                                    <tr
                                      key={ad.fbAdId}
                                      className="hover:bg-slate-800/20 bg-slate-950/80 text-[11px]"
                                    >
                                      <td className="py-2 px-4 pl-12 text-slate-600">↳</td>
                                      <td className="py-2 px-4">
                                        <div className="text-slate-300 font-normal flex items-center space-x-1.5">
                                          <span>{ad.name}</span>
                                          <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">
                                            Ad
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-mono">
                                          ID: {ad.fbAdId}
                                        </div>
                                      </td>
                                      <td className="py-2 px-3">
                                        {getStatusBadge(ad.status, ad.isPausedBySystem)}
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-300">
                                        {formatMoney(adM.spend)}
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-400">
                                        {adM.messagingConversations} tin
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-300">
                                        {adM.costPerMessaging > 0
                                          ? formatMoney(adM.costPerMessaging)
                                          : '—'}
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-500">
                                        {formatMoney(adM.cpm)}
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-500">
                                        {formatMoney(adM.cpc)}
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-500">
                                        {adM.ctr}%
                                      </td>
                                    </tr>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
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
