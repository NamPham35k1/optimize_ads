import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Lock,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { User, AdAccount } from '../../types';
import { ApiService } from '../../services/api';

interface Props {
  accounts: AdAccount[];
  currentUser: User | null;
}

export const UsersView: React.FC<Props> = ({ accounts, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'SUB_ACCOUNT' | 'ADMIN'>('SUB_ACCOUNT');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('SUB_ACCOUNT');
    setSelectedAccountIds([]);
    setIsActive(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setSelectedAccountIds(user.assignedAdAccountIds || []);
    setIsActive(user.isActive);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUserId) {
        await ApiService.updateUser(editingUserId, {
          name,
          email,
          password: password || undefined,
          role,
          isActive,
          assignedAdAccountIds: selectedAccountIds,
        });
        alert('Cập nhật tài khoản thành công!');
      } else {
        if (!password) {
          alert('Vui lòng nhập mật khẩu cho tài khoản con');
          setLoading(false);
          return;
        }
        await ApiService.createUser({
          name,
          email,
          password,
          role,
          assignedAdAccountIds: selectedAccountIds,
        });
        alert('Tạo tài khoản con thành công!');
      }
      setShowModal(false);
      resetForm();
      await loadUsers();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) return;
    try {
      await ApiService.deleteUser(id);
      await loadUsers();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            <span>Quản Lý Tài Khoản Con & Phân Quyền Nhân Viên</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tạo tài khoản đăng nhập riêng cho từng nhân viên / media buyer. Mỗi tài khoản con chỉ được xem và quản lý đúng các Tài Khoản Ads được chỉ định.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm Tài Khoản Con Mới</span>
          </button>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {users.map((u) => {
          const isAdmin = u.role === 'ADMIN';
          const assignedCount = u.assignedAdAccountIds?.length || 0;

          return (
            <div
              key={u.id}
              className={`bg-slate-900/60 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all ${
                isAdmin
                  ? 'border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${
                        isAdmin
                          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                          : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {isAdmin ? <Shield className="w-5 h-5" /> : u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {currentUser?.id === u.id && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            Bạn
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isAdmin
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {isAdmin ? 'QUẢN TRỊ VIÊN' : 'TÀI KHOẢN CON'}
                  </span>
                </div>

                {/* Assigned Ad Accounts info */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Tài khoản Ads được phép truy cập:</span>
                    </span>
                    <strong className="text-white">
                      {isAdmin ? 'Toàn bộ tài khoản' : `${assignedCount} tài khoản`}
                    </strong>
                  </div>

                  {!isAdmin && u.assignedAdAccounts && u.assignedAdAccounts.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {u.assignedAdAccounts.map((acc) => (
                        <span
                          key={acc.id}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono"
                        >
                          {acc.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {!isAdmin && assignedCount === 0 && (
                    <p className="text-[10px] text-amber-400/80 pt-0.5">
                      ⚠️ Chưa được gán tài khoản quảng cáo nào
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span
                  className={`flex items-center gap-1 text-[11px] ${
                    u.isActive ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {u.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{u.isActive ? 'Đang hoạt động' : 'Đã khóa'}</span>
                </span>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleOpenEdit(u)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                    title="Chỉnh sửa tài khoản"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {currentUser?.id !== u.id && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg cursor-pointer"
                      title="Xóa tài khoản"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" />
                <span>{editingUserId ? 'Chỉnh Sửa Tài Khoản' : 'Thêm Tài Khoản Con Mới'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Họ và Tên Nhân Viên / Media Buyer *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Long - Media Buyer 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Email Đăng Nhập *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: buyer1@congty.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Mật Khẩu Đăng Nhập {editingUserId && '(Để trống nếu không muốn đổi)'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUserId ? '••••••••' : 'Nhập mật khẩu...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Vai Trò</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="SUB_ACCOUNT">Tài khoản con (Chỉ xem ads được gán)</option>
                    <option value="ADMIN">Quản trị viên (Toàn quyền)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Trạng Thái</label>
                  <select
                    value={isActive ? 'active' : 'inactive'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Đã khóa tài khoản</option>
                  </select>
                </div>
              </div>

              {/* Assign Ad Accounts Checklist (only for SUB_ACCOUNT) */}
              {role === 'SUB_ACCOUNT' && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300 text-xs">
                      Chỉ định các Tài Khoản Ads được phép truy cập:
                    </span>
                    <span className="text-[11px] text-blue-400">
                      Đã chọn {selectedAccountIds.length} / {accounts.length}
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {accounts.map((acc) => {
                      const isChecked = selectedAccountIds.includes(acc.id);
                      return (
                        <label
                          key={acc.id}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-blue-950/40 border-blue-500/50 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedAccountIds(selectedAccountIds.filter((id) => id !== acc.id));
                                } else {
                                  setSelectedAccountIds([...selectedAccountIds, acc.id]);
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate font-semibold">{acc.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{acc.facebookAdAccountId}</span>
                        </label>
                      );
                    })}
                    {accounts.length === 0 && (
                      <p className="text-center py-2 text-slate-500 text-xs">
                        Chưa có tài khoản ads nào trong hệ thống.
                      </p>
                    )}
                  </div>
                </div>
              )}

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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20"
                >
                  {loading ? 'Đang lưu...' : editingUserId ? 'Cập Nhật' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
