import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { AdAccount, PancakeShop, PancakeFinancialStats } from '../../types';
import { ApiService } from '../../services/api';

interface Props {
  selectedAccount: AdAccount | null;
  currency: string;
}

export const PancakeView: React.FC<Props> = ({ selectedAccount, currency = 'VND' }) => {
  const [shops, setShops] = useState<PancakeShop[]>([]);
  const [stats, setStats] = useState<PancakeFinancialStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form states for connecting shop
  const [name, setName] = useState('Kho Hàng Pancake Chính');
  const [shopId, setShopId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [pageId, setPageId] = useState('');
  const [targetCostPercent, setTargetCostPercent] = useState(35);
  const [warningCostPercent, setWarningCostPercent] = useState(40);
  const [dangerCostPercent, setDangerCostPercent] = useState(50);

  const loadData = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const [shopList, financialStats] = await Promise.all([
        ApiService.getPancakeShops(selectedAccount.id).catch(() => []),
        ApiService.getPancakeStats(selectedAccount.id).catch(() => null),
      ]);
      setShops(shopList);
      setStats(financialStats);
    } catch (err: any) {
      console.error('Error loading Pancake data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAccount]);

  const handleConnectShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId.trim() || !apiToken.trim()) {
      alert('Vui lòng nhập Shop ID và API Token từ Pancake POS');
      return;
    }
    setLoading(true);
    try {
      await ApiService.connectPancakeShop({
        name,
        shopId: shopId.trim(),
        apiToken: apiToken.trim(),
        pageId: pageId.trim() || undefined,
        adAccountId: selectedAccount?.id,
        targetCostPercent: Number(targetCostPercent),
        warningCostPercent: Number(warningCostPercent),
        dangerCostPercent: Number(dangerCostPercent),
      });
      setShowModal(false);
      setName('Kho Hàng Pancake Chính');
      setShopId('');
      setApiToken('');
      setPageId('');
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi kết nối Pancake: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedMock = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      await ApiService.seedMockPancake(selectedAccount.id, 'Cửa Hàng Pancake Demo');
      await loadData();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncShop = async (id: string) => {
    setLoading(true);
    try {
      const res = await ApiService.syncPancakeShop(id);
      alert(`Đồng bộ thành công! Đã ghi nhận ${res.syncedCount} đơn hàng.`);
      await loadData();
    } catch (err: any) {
      alert(`Lỗi đồng bộ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShop = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn ngắt kết nối cửa hàng này?')) return;
    try {
      await ApiService.deletePancakeShop(id);
      await loadData();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const formatMoney = (val?: number) => {
    if (!val && val !== 0) return '0 đ';
    return `${Math.round(val).toLocaleString('vi-VN')} đ`;
  };

  const costPercent = stats ? stats.costRevenuePercent : 0;

  // Determine status color & label
  let statusBadge = {
    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    label: 'Mức Cho Phép (An Toàn ≤ 35%)',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  };

  if (costPercent > 50) {
    statusBadge = {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      label: 'Mức Nguy Hiểm (> 50% - Lỗ Nặng)',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
    };
  } else if (costPercent > 35) {
    statusBadge = {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      label: 'Mức Cảnh Báo (35% - 40%)',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-indigo-400" />
            <span>POS Pancake & Đánh Giá Chi Phí Lỗ/Lãi</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tự động đối chiếu Chi phí Facebook Ads với Doanh thu đơn hàng thực tế từ POS Pancake để giám sát tỷ lệ chi phí.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSeedMock}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tạo Dữ Liệu Demo Pancake</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Kết Nối POS Pancake</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Threshold Zone Visual Gauge */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-sm text-white">Thang Đo Chi Phí Ads / Doanh Thu (Cost-to-Revenue Ratio)</h3>
            <p className="text-xs text-slate-400">
              Công thức: <code>(Chi phí Ads / Doanh thu Pancake) × 100%</code>
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 ${statusBadge.bg}`}>
            {statusBadge.icon}
            <span>{statusBadge.label}</span>
          </div>
        </div>

        {/* Visual Progress Bar with 3 Zones */}
        <div className="space-y-2">
          <div className="h-5 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex relative">
            {/* Zone 1: Safe <= 35% */}
            <div style={{ width: '35%' }} className="bg-emerald-500/30 border-r border-emerald-500/50 flex items-center justify-center text-[10px] text-emerald-300 font-bold">
              ≤ 35% Cho phép
            </div>
            {/* Zone 2: Warning 35% - 50% */}
            <div style={{ width: '15%' }} className="bg-amber-500/30 border-r border-amber-500/50 flex items-center justify-center text-[10px] text-amber-300 font-bold">
              35-40% Cảnh báo
            </div>
            {/* Zone 3: Danger > 50% */}
            <div style={{ width: '50%' }} className="bg-rose-500/30 flex items-center justify-center text-[10px] text-rose-300 font-bold">
              &gt; 50% Nguy hiểm (Lỗ)
            </div>

            {/* Current Value Marker Pin */}
            {stats && stats.totalRevenue > 0 && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-all"
                style={{ left: `${Math.min(costPercent, 100)}%` }}
              >
                <div className="absolute -top-7 -translate-x-1/2 bg-white text-slate-950 px-2 py-0.5 rounded text-[10px] font-black shadow-md whitespace-nowrap">
                  Hiện tại: {costPercent}%
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>0% (Rất Lãi)</span>
            <span className="text-emerald-400 font-semibold">35% (Ngưỡng an toàn tối đa)</span>
            <span className="text-amber-400 font-semibold">40% (Chạm mốc cảnh báo)</span>
            <span className="text-rose-400 font-semibold">50%+ (Báo động đỏ)</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tổng Doanh Thu (Pancake)</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-black text-white">{formatMoney(stats?.totalRevenue)}</p>
          <p className="text-[11px] text-indigo-400 font-medium">
            Từ {stats?.orderCount || 0} đơn hàng thành công
          </p>
        </div>

        {/* Chi phí Ads */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tổng Chi Phí Facebook Ads</span>
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-white">{formatMoney(stats?.totalAdsSpend)}</p>
          <p className="text-[11px] text-slate-400">Tiêu trên các chiến dịch</p>
        </div>

        {/* Tỷ lệ % */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tỷ Lệ Chi Phí Ads / Doanh Thu</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className={`text-xl font-black ${costPercent > 50 ? 'text-rose-400' : costPercent > 35 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {costPercent}%
          </p>
          <p className="text-[11px] text-slate-400">
            Mục tiêu cho phép: &le; 35%
          </p>
        </div>

        {/* Lãi ròng */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Lãi Thô (Doanh Thu - Ads)</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <p className={`text-xl font-black ${(stats?.profit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatMoney(stats?.profit)}
          </p>
          <p className="text-[11px] text-slate-400">
            {(stats?.profit || 0) >= 0 ? 'Đang có lãi' : 'Đang bị lỗ ngân sách'}
          </p>
        </div>
      </div>

      {/* Breakdown per Campaign Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <span>Bảng Đánh Giá Chi Phí Từng Chiến Dịch</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
              {stats?.campaigns?.length || 0} chiến dịch
            </span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Tên Chiến Dịch</th>
                <th className="py-3 px-3 text-right">Chi Phí Ads</th>
                <th className="py-3 px-3 text-right">Doanh Thu Pancake</th>
                <th className="py-3 px-3 text-right">Số Đơn</th>
                <th className="py-3 px-3 text-right">Tỷ Lệ Chi Phí (%)</th>
                <th className="py-3 px-3 text-right">Lãi/Lỗ</th>
                <th className="py-3 px-3 text-center">Đánh Giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {!stats || stats.campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Chưa có dữ liệu chiến dịch đối chiếu. Bấm "Tạo Dữ Liệu Demo Pancake" để xem thử.
                  </td>
                </tr>
              ) : (
                stats.campaigns.map((c) => (
                  <tr key={c.campaignId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      <div>{c.campaignName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: {c.campaignId}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white">
                      {formatMoney(c.spend)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-indigo-300">
                      {formatMoney(c.revenue)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                        {c.orders} đơn
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black">
                      <span
                        className={
                          c.costRevenuePercent > 50
                            ? 'text-rose-400'
                            : c.costRevenuePercent > 35
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {c.costRevenuePercent}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      <span className={c.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatMoney(c.profit)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                          c.status === 'SAFE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : c.status === 'WARNING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {c.status === 'SAFE'
                          ? '✅ Cho phép (≤35%)'
                          : c.status === 'WARNING'
                          ? '⚠️ Cảnh báo (35-40%)'
                          : '🚨 Nguy hiểm (>50%)'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connected Shops List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-sm text-white">Cửa Hàng Pancake Đang Kết Nối</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((s) => (
            <div
              key={s.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{s.name}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Đang hoạt động
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Shop ID: {s.shopId}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Đơn hàng đã lưu: <strong>{s._count?.orders || 0}</strong> đơn
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => handleSyncShop(s.id)}
                  disabled={loading}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đồng bộ ngay</span>
                </button>
                <button
                  onClick={() => handleDeleteShop(s.id)}
                  className="text-slate-500 hover:text-red-400 cursor-pointer"
                  title="Hủy kết nối"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {shops.length === 0 && (
            <div className="col-span-full py-6 text-center text-slate-500 text-xs">
              Chưa có cửa hàng Pancake nào kết nối. Bấm <strong>"Kết Nối POS Pancake"</strong> hoặc <strong>"Tạo Dữ Liệu Demo Pancake"</strong> để bắt đầu.
            </div>
          )}
        </div>
      </div>

      {/* Connect Pancake Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                <span>Kết Nối POS Pancake</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnectShop} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Tên Cửa Hàng *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Kho Tổng Pancake Mỹ Phẩm"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Shop ID *</label>
                  <input
                    type="text"
                    required
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    placeholder="VD: 123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Page ID (Nếu có)</label>
                  <input
                    type="text"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder="VD: 1092837482"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Pancake POS API Key / Token *
                </label>
                <input
                  type="password"
                  required
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Dán API Key lấy từ pos.pages.fm"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Lấy tại Cài đặt ➔ Tích hợp API trong hệ thống Pancake POS.
                </p>
              </div>

              {/* Threshold configurations */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 block text-[11px]">
                  Cài Đặt Các Mốc Đánh Giá Chi Phí Ads / Doanh Thu:
                </span>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <label className="text-emerald-400 font-semibold block mb-0.5">Mức Cho Phép</label>
                    <input
                      type="number"
                      value={targetCostPercent}
                      onChange={(e) => setTargetCostPercent(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                    <span className="text-slate-500">&le; 35%</span>
                  </div>
                  <div>
                    <label className="text-amber-400 font-semibold block mb-0.5">Mức Cảnh Báo</label>
                    <input
                      type="number"
                      value={warningCostPercent}
                      onChange={(e) => setWarningCostPercent(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                    <span className="text-slate-500">Khoảng 40%</span>
                  </div>
                  <div>
                    <label className="text-rose-400 font-semibold block mb-0.5">Mức Nguy Hiểm</label>
                    <input
                      type="number"
                      value={dangerCostPercent}
                      onChange={(e) => setDangerCostPercent(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                    <span className="text-slate-500">&gt; 50%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20"
                >
                  {loading ? 'Đang kết nối...' : 'Xác Nhận & Kết Nối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
