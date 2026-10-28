import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Clock,
  Smartphone,
  Shield,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Power,
} from 'lucide-react';
import { ApiService } from '../../services/api';

export const TelegramView: React.FC = () => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [periodicEnabled, setPeriodicEnabled] = useState(true);
  const [periodicIntervalMinutes, setPeriodicIntervalMinutes] = useState(5);
  const [maskedToken, setMaskedToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await ApiService.getTelegramConfig();
      setBotToken(cfg.botToken || '');
      setChatId(cfg.chatId || '');
      setIsEnabled(cfg.isEnabled);
      setPeriodicEnabled(cfg.periodicEnabled);
      setPeriodicIntervalMinutes(cfg.periodicIntervalMinutes || 5);
      setMaskedToken(cfg.maskedToken || '');
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      await ApiService.updateTelegramConfig({
        botToken,
        chatId,
        isEnabled,
        periodicEnabled,
        periodicIntervalMinutes: Number(periodicIntervalMinutes),
      });
      setStatusMsg({ type: 'success', text: 'Đã lưu cấu hình Telegram thành công!' });
      await loadConfig();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!botToken && !maskedToken) {
      alert('Vui lòng nhập Bot Token trước');
      return;
    }
    if (!chatId) {
      alert('Vui lòng nhập Chat ID trước');
      return;
    }

    setTesting(true);
    setStatusMsg(null);
    try {
      const res = await ApiService.testTelegram({
        botToken: botToken || undefined,
        chatId,
      });
      setStatusMsg({ type: 'success', text: res.message });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSendReportNow = async () => {
    setReporting(true);
    setStatusMsg(null);
    try {
      const res = await ApiService.sendTelegramReportNow();
      setStatusMsg({ type: 'success', text: res.message });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setReporting(false);
    }
  };

  const isConnected = isEnabled && (botToken || maskedToken) && chatId;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 shadow-lg shadow-sky-500/10">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Thông Báo Telegram & Điều Khiển Qua Điện Thoại
              {isConnected ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  🟢 ĐANG HOẠT ĐỘNG
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-bold">
                  ⚪ CHƯA KẾT NỐI
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Gửi thông báo tức thì khi ads bị tắt, tự động báo cáo định kỳ 5 phút và cho phép bạn bấm nút tắt/bật camp trực tiếp trên Telegram.
            </p>
          </div>
        </div>

        {isConnected && (
          <button
            onClick={handleSendReportNow}
            disabled={reporting}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-sky-600/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reporting ? 'animate-spin' : ''}`} />
            <span>{reporting ? 'Đang gửi...' : 'Gửi báo cáo ngay về Telegram'}</span>
          </button>
        )}
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-3 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>Cấu Hình Kết Nối Bot Telegram</span>
            </h3>

            {/* Bot Token */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Telegram Bot Token:
              </label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={maskedToken ? `Hiện tại: ${maskedToken}` : 'Ví dụ: 7819238491:AAH...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Nhắn tin với <strong className="text-sky-400">@BotFather</strong> trên Telegram để lấy mã Token miễn phí.
              </p>
            </div>

            {/* Chat ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Chat ID nhận tin nhắn (ID của bạn hoặc ID Nhóm):
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Ví dụ: 123456789 (hoặc -100123456789 nếu là nhóm)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Nhắn tin với <strong className="text-sky-400">@userinfobot</strong> trên Telegram để xem số ID của bạn.
              </p>
            </div>

            <div className="h-[1px] bg-slate-800/80 my-4" />

            {/* Toggles */}
            <div className="space-y-4">
              {/* Master toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-sky-400" />
                    <span>Bật Thông Báo Telegram</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Gửi tin nhắn cảnh báo ngay lập tức khi bot tự động tắt hoặc nhóm ads vi phạm.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              {/* Periodic 5-minute report toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Báo Cáo Số Liệu Định Kỳ Về Điện Thoại</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Tự động gửi tin tổng kết chi tiêu, số tin nhắn, CPA hôm nay để bạn không cần mở máy tính.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={periodicEnabled}
                    onChange={(e) => setPeriodicEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* Interval select */}
              {periodicEnabled && (
                <div className="pl-4 border-l-2 border-l-amber-500/50 py-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Chu kỳ gửi báo cáo:
                  </label>
                  <select
                    value={periodicIntervalMinutes}
                    onChange={(e) => setPeriodicIntervalMinutes(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value={5}>Mỗi 5 phút (Khuyên dùng khi đang canh camp)</option>
                    <option value={15}>Mỗi 15 phút</option>
                    <option value={30}>Mỗi 30 phút</option>
                    <option value={60}>Mỗi 1 tiếng</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    💡 Bạn có thể tắt tạm thời báo cáo 5 phút bất cứ lúc nào bằng cách nhắn tin <code className="text-amber-400">/stop5m</code> trên Telegram.
                  </p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center space-x-3 pt-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer text-center"
              >
                {loading ? 'Đang lưu...' : 'Lưu Cấu Hình'}
              </button>

              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="py-2.5 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testing ? 'Đang gửi...' : 'Bấm Gửi Thử Nghiệm'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Mobile Interactive Mock & Commands */}
        <div className="space-y-6">
          {/* Mobile Preview Card */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>📱 Trải Nghiệm Trên Điện Thoại</span>
            </h3>

            {/* Telegram Message Mockup */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] space-y-2 text-slate-300">
              <div className="font-bold text-rose-400 flex items-center gap-1">
                <span>🚨 [AUTO ADS CARE — ĐÃ TẮT ADS]</span>
              </div>
              <div className="space-y-1 text-slate-300">
                <p>🎯 <b>Đối tượng:</b> [AdSet] Váy Trễ Vai</p>
                <p>💰 <b>Lý do:</b> CPA = 95.000đ (&gt; 80k, 2 lần)</p>
                <p>⏰ <b>Thời gian:</b> 10:15:20</p>
                <p>🛡️ <b>Trạng thái:</b> Đã tắt trên Facebook!</p>
              </div>

              {/* Inline Action Buttons Mockup */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button className="py-1 px-2 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold text-center">
                  🟢 Bật lại
                </button>
                <button className="py-1 px-2 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold text-center">
                  🛑 Dừng khẩn cấp
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              👉 Bạn có thể bấm nút trực tiếp ngay trên Telegram để <strong>Tắt hoặc Bật lại camp</strong> mà không cần mở máy tính!
            </p>
          </div>

          {/* Commands Guide Card */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Các Lệnh Điều Khiển Từ Xa</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <code className="text-sky-400 font-bold font-mono">/status</code>
                <span className="text-[11px] text-slate-400">Xem ngay chi tiêu & CPA</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <code className="text-amber-400 font-bold font-mono">/stop5m</code>
                <span className="text-[11px] text-slate-400">Tắt báo 5 phút (yên tĩnh)</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <code className="text-emerald-400 font-bold font-mono">/start5m</code>
                <span className="text-[11px] text-slate-400">Bật lại báo 5 phút</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <code className="text-rose-400 font-bold font-mono">/emergency</code>
                <span className="text-[11px] text-slate-400">Bật/Tắt Dừng Khẩn Cấp</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide: How to get Bot Token & Chat ID */}
      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>📖 Hướng Dẫn 3 Bước Tạo Bot Telegram Miễn Phí (Chỉ mất 1 phút)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              1
            </span>
            <p className="font-bold text-white">Lấy Bot Token</p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Vào Telegram tìm <strong className="text-sky-400">@BotFather</strong>, gõ lệnh <code>/newbot</code>, đặt tên cho bot. Sau đó copy đoạn mã Token dán vào ô bên trên.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              2
            </span>
            <p className="font-bold text-white">Lấy Chat ID</p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Vào Telegram tìm <strong className="text-sky-400">@userinfobot</strong>, bấm <code>/start</code>. Bạn sẽ thấy dòng <strong>Id: 12345678</strong>. Copy số đó dán vào ô Chat ID.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              3
            </span>
            <p className="font-bold text-white">Kích hoạt & Gửi thử</p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Mở cuộc trò chuyện với con bot bạn vừa tạo, bấm nút <strong>START</strong> một lần. Sau đó quay lại đây bấm nút <strong>"Bấm Gửi Thử Nghiệm"</strong>!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
