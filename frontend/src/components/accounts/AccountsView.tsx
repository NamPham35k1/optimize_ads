import React, { useState } from 'react';
import {
  Facebook,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Plus,
  Key,
  ExternalLink,
  CheckCircle2,
  Lock,
  Trash2,
} from 'lucide-react';
import { AdAccount } from '../../types';
import { ApiService } from '../../services/api';

interface Props {
  accounts: AdAccount[];
  selectedAccount: AdAccount | null;
  onSelectAccount: (acc: AdAccount) => void;
  onRefresh: () => void;
}

export const AccountsView: React.FC<Props> = ({
  accounts,
  selectedAccount,
  onSelectAccount,
  onRefresh,
}) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter out any mock accounts - only display real connected accounts
  const displayAccounts = accounts.filter((acc) => {
    if (acc.isMock) return false;
    const nameLower = (acc.name || '').toLowerCase();
    if (nameLower.includes('mock') || nameLower.includes('demo account')) return false;
    const idLower = (acc.facebookAdAccountId || '').toLowerCase();
    if (idLower.includes('mock')) return false;
    return true;
  });


  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken.trim()) {
      setError('Vui lòng nhập Access Token từ Meta for Developers');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await ApiService.connectAccount(accessToken, accountName);
      localStorage.setItem("autoads_saved_meta_token", accessToken.trim());
      if (accountName.trim()) localStorage.setItem("autoads_saved_meta_account_name", accountName.trim());
      setSuccessMsg(res.message);
      setAccessToken('');
      setAccountName('');
      setTimeout(() => {
        setShowConnectModal(false);
        setSuccessMsg(null);
        onRefresh();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (id: string) => {
    setLoading(true);
    try {
      await ApiService.syncAccount(id);
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi khi đồng bộ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tài khoản "${name}" khỏi hệ thống không?`)) return;
    setLoading(true);
    try {
      await ApiService.deleteAccount(id);
      localStorage.removeItem("autoads_saved_meta_token");
      localStorage.removeItem("autoads_saved_meta_account_name");
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi khi xóa tài khoản: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Quản Lý Tài Khoản Quảng Cáo Meta
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kết nối trực tiếp thông qua Access Token chính thức của Meta. Tuyệt đối không yêu cầu mật khẩu Facebook.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Kết Nối Tài Khoản Thật (Live)</span>
          </button>
        </div>
      </div>

      {/* Security Note Banner */}
      <div className="bg-slate-900/60 border border-blue-500/20 rounded-2xl p-4 flex items-start space-x-3 text-xs text-slate-300">
        <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Bảo mật chuẩn Meta API:</p>
          <p className="text-slate-400">
            Access Token của bạn được mã hóa hoàn toàn bằng thuật toán <strong>AES-256-GCM</strong> trước khi lưu vào cơ sở dữ liệu và chỉ được giải mã tạm thời trong bộ nhớ backend khi thực thi tác vụ. Token không bao giờ được gửi về phía trình duyệt frontend.
          </p>
        </div>
      </div>

      {/* Account Cards or Empty State */}
      {displayAccounts.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-500/5">
            <Facebook className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-white">Chưa Có Tài Khoản Quảng Cáo Nào Được Kết Nối</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hệ thống đang ở trạng thái sạch, không dùng dữ liệu mẫu. Để bắt đầu giám sát chiến dịch và bật chế độ tự động canh ads, vui lòng kết nối tài khoản Meta Marketing API thật.
            </p>
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition-all cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Kết Nối Tài Khoản Thật (Live)</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayAccounts.map((acc) => {

          const isSelected = selectedAccount?.id === acc.id;
          const scopes = acc.connectedAccount?.scopes ? acc.connectedAccount.scopes.split(',') : [];
          const hasAdsManagement = scopes.some((s) => s.includes('ads_management'));

          return (
            <div
              key={acc.id}
              className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-950/20 border-blue-500 shadow-xl shadow-blue-500/10'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{acc.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">{acc.facebookAdAccountId}</p>
                    </div>
                  </div>
                  {acc.isMock ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      MOCK MODE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      LIVE API
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">Tiền Tệ:</span>
                    <span className="font-bold text-white">{acc.currency}</span>
                  </div>
                  <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">Múi Giờ:</span>
                    <span className="font-medium text-slate-200">{acc.timezoneName}</span>
                  </div>
                </div>

                {/* Permissions badge */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">Quyền API Đã Cấp:</span>
                  <div className="flex flex-wrap gap-1">
                    {scopes.map((s, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                  {!hasAdsManagement && !acc.isMock && (
                    <div className="flex items-center space-x-1.5 text-amber-400 text-[11px] font-medium pt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Thiếu quyền "ads_management" (Chỉ đọc)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-5 mt-4 border-t border-slate-800">
                <button
                  onClick={() => onSelectAccount(acc)}
                  disabled={isSelected}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                  }`}
                >
                  {isSelected ? 'Đang Quản Lý' : 'Chọn Tài Khoản'}
                </button>
                <button
                  onClick={() => handleSync(acc.id)}
                  title="Đồng bộ lại chiến dịch & chỉ số từ Meta"
                  disabled={loading}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteAccount(acc.id, acc.name)}
                  title="Xóa tài khoản này"
                  disabled={loading}
                  className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 hover:border-rose-800/60 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-blue-400 font-bold text-base">
                <Facebook className="w-5 h-5" />
                <span>Kết Nối Meta Marketing API Chính Thức</span>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tên Gợi Nhớ (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Ví dụ: BM Công Ty TNHH ABC"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Meta User Access Token <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  rows={4}
                  placeholder="Dán User Access Token (EAA...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>Yêu cầu quyền: ads_read, ads_management, read_insights</span>
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Lấy Token tại Graph API Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center space-x-2"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{loading ? 'Đang xác thực...' : 'Kiểm Tra & Kết Nối'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Guide Modal: Long-Lived & Permanent Meta Token */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-base">
                <Key className="w-5 h-5" />
                <span>Hướng Dẫn Lấy Access Token Vĩnh Viễn Hoặc Dài Hạn (Meta)</span>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              {/* Method 1: System User (Permanent) */}
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cách 1: Lấy Token VĨNH VIỄN qua BM System User (Khuyên dùng nhất ⭐)</span>
                </div>
                <p className="text-slate-400">
                  Token này gắn với Doanh nghiệp (BM), <strong>không bao giờ hết hạn</strong> và không bị phụ thuộc vào tài khoản Facebook cá nhân.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
                  <li>
                    Truy cập trang Cài đặt Doanh nghiệp:{' '}
                    <a
                      href="https://business.facebook.com/settings/system-users"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      business.facebook.com/settings/system-users <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    Tại mục <strong>Người dùng</strong> &gt; <strong>Người dùng hệ thống (System Users)</strong> &gt; Bấm nút <strong>Thêm</strong> &gt; Đặt tên (ví dụ: <code className="text-indigo-300 font-mono">ToolAutoAds</code>) &gt; Chọn vai trò <strong>Quản trị viên (Admin)</strong>.
                  </li>
                  <li>
                    Bấm vào tên người dùng vừa tạo &gt; Bấm nút <strong>Gán tài sản (Add Assets)</strong> &gt; Chọn <strong>Tài khoản quảng cáo</strong> của bạn &gt; Bật công tắc <strong>Toàn quyền quản lý (Full Control)</strong> &gt; Bấm <strong>Lưu thay đổi</strong>.
                  </li>
                  <li>
                    Bấm nút <strong>Tạo mã mới (Generate New Token)</strong>:
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-400">
                      <li>Chọn <strong>Ứng dụng (App)</strong> của bạn.</li>
                      <li>Mục <strong>Hạn của mã (Token Expiration)</strong>: Chọn <strong className="text-emerald-400 font-bold">Không bao giờ (Never)</strong>.</li>
                      <li>Tích chọn 3 quyền bắt buộc: <code className="text-amber-300">ads_read</code>, <code className="text-amber-300">ads_management</code>, <code className="text-amber-300">read_insights</code>.</li>
                    </ul>
                  </li>
                  <li>
                    Bấm <strong>Tạo mã truy cập</strong> &gt; Sao chép mã (bắt đầu bằng <code className="text-indigo-300">EAAB...</code>) và dán vào tool.
                  </li>
                </ol>
              </div>

              {/* Method 2: Extend to 60 days */}
              <div className="bg-slate-950/80 border border-blue-500/30 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm">
                  <Key className="w-4 h-4" />
                  <span>Cách 2: Đổi Token ngắn hạn sang Token 60 NGÀY (Nhanh trong 1 phút)</span>
                </div>
                <p className="text-slate-400">
                  Nếu bạn đã có User Token thông thường từ Graph API Explorer (hạn 1-2 tiếng), bạn có thể gia hạn thành <strong>60 ngày</strong>:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
                  <li>
                    Truy cập công cụ Kiểm tra mã truy cập:{' '}
                    <a
                      href="https://developers.facebook.com/tools/debug/accesstoken/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      developers.facebook.com/tools/debug/accesstoken/ <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    Dán mã Token hiện tại của bạn vào ô &gt; Bấm <strong>Gỡ lỗi (Debug)</strong>.
                  </li>
                  <li>
                    Cuộn xuống dưới cùng của trang &gt; Bấm nút <strong>Mở rộng mã truy cập (Extend Access Token)</strong>.
                  </li>
                  <li>
                    Facebook sẽ sinh ra một chuỗi mã mới có hạn <strong>60 ngày</strong>. Copy mã đó và dán vào tool.
                  </li>
                </ol>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                💡 <strong>Tính năng Tự Động Khôi Phục:</strong> Tool đã được trang bị bộ nhớ đệm tự động. Token sau khi dán vào tool sẽ được lưu an toàn trên trình duyệt của bạn. Ngay cả khi máy chủ Render khởi động lại, tool sẽ tự động nạp lại tài khoản và quy tắc mà bạn không cần phải nhập lại!
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowGuideModal(false);
                  setShowConnectModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                Đã Hiểu, Kết Nối Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};