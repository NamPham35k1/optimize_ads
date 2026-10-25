import React, { useState } from 'react';
import { LogIn, Key, Mail, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { ApiService } from '../../services/api';
import { User } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<Props> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@autoadscare.io');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.login(email.trim(), password);
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Đăng Nhập Hệ Thống</h3>
              <p className="text-xs text-slate-400">Đăng nhập Admin hoặc Tài Khoản Con</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-300 block mb-1">Email Đăng Nhập</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-1">Mật Khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
              <span>Admin mặc định: <code>admin@autoadscare.io</code></span>
              <span>Mật khẩu: <code>admin123</code></span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
