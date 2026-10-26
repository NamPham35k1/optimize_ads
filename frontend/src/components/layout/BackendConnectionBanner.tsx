import React, { useState, useEffect } from 'react';
import {
  Loader2,
  WifiOff,
  CheckCircle2,
  RefreshCw,
  Settings,
  Server,
  Zap,
  Clock,
  X,
  ExternalLink,
} from 'lucide-react';
import { ApiService, DEFAULT_RENDER_URL } from '../../services/api';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

interface Props {
  connectionState: ConnectionState;
  elapsedSeconds: number;
  onRetry: () => void;
  onSuccessDismiss?: () => void;
}

export const BackendConnectionBanner: React.FC<Props> = ({
  connectionState,
  elapsedSeconds,
  onRetry,
  onSuccessDismiss,
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const effectiveUrl = ApiService.getEffectiveBackendUrl() || DEFAULT_RENDER_URL;

  // Initialize input when modal opens
  const handleOpenModal = () => {
    setCustomUrl(ApiService.getCustomBackendUrl() || effectiveUrl);
    setTestResult(null);
    setShowConfigModal(true);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const clean = customUrl.trim().replace(/\/+$/, '');
      const testUrl = clean ? (clean.endsWith('/api') ? `${clean}/system/status` : `${clean}/health`) : '/health';
      const start = Date.now();
      const res = await fetch(testUrl, { method: 'GET', mode: 'cors' });
      const timeMs = Date.now() - start;
      if (res.ok) {
        setTestResult({
          success: true,
          msg: `Kết nối thành công! Phản hồi trong ${timeMs}ms.`,
        });
      } else {
        setTestResult({
          success: false,
          msg: `Máy chủ trả về HTTP ${res.status}. Vui lòng kiểm tra lại URL.`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: `Không thể kết nối (${err.message || 'Lỗi mạng'}). Nếu Render đang ngủ, hãy thử lại sau vài giây.`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = () => {
    ApiService.setCustomBackendUrl(customUrl.trim());
    setShowConfigModal(false);
    onRetry();
  };

  const handleResetToRender = () => {
    setCustomUrl(DEFAULT_RENDER_URL);
    ApiService.setCustomBackendUrl(DEFAULT_RENDER_URL);
    setShowConfigModal(false);
    onRetry();
  };

  // If connected, show gentle success or hidden
  if (connectionState === 'idle') {
    return null;
  }

  // Calculate progress percentage for ~45s Render cold start
  const progressPercent = Math.min(95, Math.round((elapsedSeconds / 45) * 100));

  return (
    <>
      {/* CONNECTING / WAKING UP RENDER STATE */}
      {connectionState === 'connecting' && (
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border-b border-blue-500/30 px-4 py-2.5 text-slate-200 z-30 shrink-0 shadow-lg relative overflow-hidden">
          {/* Subtle animated background progress line */}
          <div
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-400 transition-all duration-1000 ease-linear shadow-[0_0_12px_rgba(59,130,246,0.8)]"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start md:items-center space-x-3">
              <div className="relative shrink-0 mt-0.5 md:mt-0">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
                    Đang kết nối & đánh thức máy chủ Backend...
                  </span>
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-300" />
                    Đang chờ: {elapsedSeconds}s (dự kiến 30-50s)
                  </span>
                </div>
                <p className="text-xs text-slate-300/90 leading-relaxed">
                  Máy chủ Render (gói Free) tự động chuyển sang chế độ <strong>ngủ (Spin down)</strong> khi không có truy cập. Lần gọi đầu tiên sẽ cần <strong>30 - 50 giây</strong> để máy chủ khởi động lại. Xin vui lòng chờ, hệ thống đang tự động kiểm tra...
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
              <button
                onClick={handleOpenModal}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Cấu hình URL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONNECTED SUCCESS NOTIFICATION */}
      {connectionState === 'connected' && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-4 py-2 text-xs text-emerald-200 flex items-center justify-between z-30 shrink-0 transition-all">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Đã kết nối Backend thành công!</strong> Máy chủ Render ({effectiveUrl}) đã sẵn sàng hoạt động.
            </span>
          </div>
          {onSuccessDismiss && (
            <button
              onClick={onSuccessDismiss}
              className="text-emerald-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ERROR / DISCONNECTED STATE */}
      {connectionState === 'error' && (
        <div className="bg-amber-950/70 border-b border-amber-500/30 px-4 py-2.5 text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 z-30 shrink-0 shadow-md">
          <div className="flex items-start md:items-center space-x-2.5">
            <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 md:mt-0" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold text-amber-100 flex items-center gap-1.5 flex-wrap">
                Chưa kết nối được máy chủ Backend
                <span className="text-[11px] font-mono text-amber-300 bg-amber-900/50 px-1.5 py-0.5 rounded border border-amber-700/50">
                  {effectiveUrl}
                </span>
              </div>
              <p className="text-amber-200/90 mt-0.5">
                Máy chủ Render có thể đang ở trạng thái ngủ (cần 30-50s để thức dậy) hoặc đang trong quá trình build lại.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
            <button
              onClick={onRetry}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Đánh thức & Thử lại</span>
            </button>

            <button
              onClick={handleOpenModal}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Cấu hình</span>
            </button>
          </div>
        </div>
      )}

      {/* CONFIG MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Cấu hình Máy Chủ Backend</h3>
                  <p className="text-xs text-slate-400">Kiểm tra và trỏ API Backend cho giao diện</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  URL Máy Chủ Backend (Render / VPS / Localhost)
                </label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://optimize-ads.onrender.com"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Mặc định: <code className="text-cyan-400 font-mono">{DEFAULT_RENDER_URL}</code>
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{testResult.msg}</span>
                </div>
              )}

              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 space-y-1.5 text-slate-400">
                <p className="font-semibold text-slate-300 flex items-center gap-1">
                  💡 Lưu ý về Render Free:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  <li>Render Free sẽ tự ngủ nếu 15 phút không có request.</li>
                  <li>Khi đánh thức lần đầu, máy chủ mất <strong>30-50 giây</strong> để phản hồi.</li>
                  <li>Nếu dùng Vercel, bạn cũng có thể set biến môi trường <code className="text-amber-300 font-mono">VITE_API_URL</code> trong mục Project Settings.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleResetToRender}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Dùng Render Mặc Định
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={testing}
                  onClick={handleTestConnection}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {testing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Kiểm tra Ping</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-colors cursor-pointer"
                >
                  Lưu & Áp Dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
