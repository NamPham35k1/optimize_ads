import React from 'react';
import {
  DollarSign,
  MessageSquare,
  TrendingUp,
  Play,
  Pause,
  AlertTriangle,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { DashboardSummary } from '../../types';

interface Props {
  summary: DashboardSummary | null;
  onNavigateTab: (tab: any) => void;
  currency: string;
}

export const DashboardView: React.FC<Props> = ({ summary, onNavigateTab, currency = 'VND' }) => {
  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Đang tải dữ liệu dashboard...
      </div>
    );
  }

  const formatMoney = (val: number) => {
    return `${Math.round(val).toLocaleString('vi-VN')} ${currency}`;
  };

  const kpis = [
    {
      title: 'Chi Tiêu Hôm Nay',
      value: formatMoney(summary.todaySpend),
      subtitle: `Khoảng thời gian: ${formatMoney(summary.totalSpendPeriod)}`,
      icon: <DollarSign className="w-5 h-5 text-blue-400" />,
      bg: 'from-blue-600/20 to-indigo-600/10 border-blue-500/20',
    },
    {
      title: 'Tổng Số Tin Nhắn',
      value: `${summary.totalMessages.toLocaleString('vi-VN')} tin`,
      subtitle: 'Cuộc trò chuyện mới từ Ads',
      icon: <MessageSquare className="w-5 h-5 text-emerald-400" />,
      bg: 'from-emerald-600/20 to-teal-600/10 border-emerald-500/20',
    },
    {
      title: 'Chi Phí / Tin Nhắn (CPA)',
      value: summary.avgCostPerMessaging > 0 ? formatMoney(summary.avgCostPerMessaging) : '—',
      subtitle: summary.avgCostPerMessaging > 100000 ? '⚠️ Cao hơn ngưỡng 100k' : '✅ Trong ngưỡng an toàn',
      icon: <TrendingUp className="w-5 h-5 text-amber-400" />,
      bg: 'from-amber-600/20 to-orange-600/10 border-amber-500/20',
    },
    {
      title: 'Chiến Dịch Đang Chạy',
      value: summary.activeCampaigns,
      subtitle: `${summary.pausedCampaigns} chiến dịch đang tạm dừng`,
      icon: <Play className="w-5 h-5 text-indigo-400" />,
      bg: 'from-indigo-600/20 to-violet-600/10 border-indigo-500/20',
    },
    {
      title: 'Hệ Thống Tự Động Tắt',
      value: summary.autoPausedCampaigns,
      subtitle: 'Đối tượng vi phạm quy tắc',
      icon: <Pause className="w-5 h-5 text-rose-400" />,
      bg: 'from-rose-600/20 to-red-600/10 border-rose-500/20',
    },
    {
      title: 'Đang Vượt Ngưỡng Chi Phí',
      value: summary.thresholdExceededRulesCount,
      subtitle: `${summary.activeRulesCount} quy tắc giám sát đang bật`,
      icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
      bg: 'from-yellow-600/20 to-amber-600/10 border-yellow-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Bảng Điều Khiển Quản Lý Quảng Cáo
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Theo dõi chi tiêu, số lượng tin nhắn và trạng thái quy tắc tự động hóa theo thời gian thực.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateTab('rules')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Thiết Lập Quy Tắc Mới</span>
          </button>
          <button
            onClick={() => onNavigateTab('simulator')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl flex items-center space-x-2 transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <span>Mô Phỏng Thử Nghiệm</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl bg-gradient-to-br ${kpi.bg} border backdrop-blur-md transition-all hover:scale-[1.01]`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">{kpi.title}</span>
              <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                {kpi.icon}
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-2 tracking-tight">
              {kpi.value}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">{kpi.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Combined Chart: Spend & Messages */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                Biểu Đồ Chi Tiêu & Số Lượng Tin Nhắn (7 Ngày)
              </h3>
              <p className="text-xs text-slate-400">Tương quan giữa số tiền chi tiêu và số tin nhắn nhận được</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={summary.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val: any, name: any) => [
                    name === 'Chi Tiêu (VND)' ? `${val.toLocaleString()} đ` : val,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="spend"
                  name="Chi Tiêu (VND)"
                  fill="#3b82f6"
                  fillOpacity={0.15}
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
                <Bar
                  yAxisId="right"
                  dataKey="messages"
                  name="Số Tin Nhắn"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Per Messaging Trend Line */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              Xu Hướng Chi Phí / Tin Nhắn (CPA)
            </h3>
            <p className="text-xs text-slate-400">Đường đỏ thể hiện ngưỡng mục tiêu 100.000 đ</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={summary.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val.toLocaleString()} đ`, 'Chi Phí / Tin']}
                />
                <Line
                  type="monotone"
                  dataKey="costPerMsg"
                  name="CPA Thực Tế"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f59e0b' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
