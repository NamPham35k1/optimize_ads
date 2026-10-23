import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Sliders,
  PlayCircle,
  FileText,
  ShieldCheck,
  Facebook,
  Activity,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'accounts' | 'campaigns' | 'rules' | 'simulator' | 'logs';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  rulesCount: number;
  isMockMode: boolean;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  rulesCount,
  isMockMode,
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: string | number }> = [
    {
      id: 'dashboard',
      label: 'Tổng Quan (Dashboard)',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'accounts',
      label: 'Tài Khoản Ads',
      icon: <Facebook className="w-5 h-5" />,
    },
    {
      id: 'campaigns',
      label: 'Chiến Dịch & Nhóm Ads',
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: 'rules',
      label: 'Trung Tâm Quy Tắc (Rules)',
      icon: <Sliders className="w-5 h-5" />,
      badge: rulesCount > 0 ? rulesCount : undefined,
    },
    {
      id: 'simulator',
      label: 'Mô Phỏng (Rule Simulator)',
      icon: <PlayCircle className="w-5 h-5 text-indigo-400" />,
      badge: 'Test',
    },
    {
      id: 'logs',
      label: 'Nhật Ký Tự Động (Logs)',
      icon: <FileText className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
          ⚡
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            Auto Ads Care
          </h1>
          <p className="text-xs text-slate-400 font-medium">Meta Ads Automation</p>
        </div>
      </div>

      {/* Mode Badge in Sidebar */}
      <div className="px-4 py-3 border-b border-slate-800/50">
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${
            isMockMode
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isMockMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <span>{isMockMode ? 'Mock Mode (Demo)' : 'Live Meta API'}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            {isMockMode ? 'MOCK' : 'LIVE'}
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Status Card */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              Scheduler:
            </span>
            <span className="text-emerald-400 font-semibold">Tự động (1m)</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Bảo vệ:
            </span>
            <span className="text-slate-200">Dry Run & Antispam</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
